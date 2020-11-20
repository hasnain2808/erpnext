{% include "erpnext/accounts/page/bank_reconciliation_tool/upload_statement.js" %};
{% include "erpnext/accounts/page/bank_reconciliation_tool/reconciliation_row.js" %};
{% include "erpnext/accounts/page/bank_reconciliation_tool/import_preview_dialog.js" %};

// import DataTable from 'frappe-datatable';

frappe.provide("erpnext.accounts");
frappe.provide("frappe.widget.utils");
frappe.provide("frappe");
frappe.pages["bank-reconciliation-tool"].on_page_load = function (wrapper) {
	new erpnext.accounts.bankReconciliationTool(wrapper);
};

erpnext.accounts.bankReconciliationTool = class BankReconciliationTool {
	constructor(wrapper) {
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Bank Reconciliation Tool"),
			single_column: true,
		});
		this.upload_statement_button = this.page.set_secondary_action(
			__("Upload a Statement"),
			() => {
				this.upload_statement_dialog_object.upload_statement_dialog.show();
				if (
					!this.upload_statement_dialog_object.upload_statement_dialog.get_value(
						"data_import_id"
					)
				) {
					this.upload_statement_dialog_object.upload_statement_dialog
						.get_primary_btn()
						.hide();
				}
			}
		);

		this.parent = wrapper;
		this.page = this.parent.page;
		this.upload_statement_dialog_object = new erpnext.accounts.UploadStatememt();
		this.make_form();
		// this.$result = $("#transactions");
		this.$cards = $("#cards");
	}

	make_form() {
		const me = this;
		me.form = new frappe.ui.FieldGroup({
			fields: [
				{
					fieldtype: "Link",
					fieldname: "company",
					label: __("Company"),
					options: "Company",
					default: "Moha",
					change: () => {
						this.make_reconciliation_tool();
					},
				},
				{
					fieldtype: "Link",
					fieldname: "bank_account",
					label: __("Bank Account"),
					options: "Bank Account",
					get_query: () => {
						return {
							filters: {
								company: [
									"in",
									[me.form.get_value("company") || ""],
								],
							},
						};
					},
					change: () => {
						me.form.refresh_dependency();

						me.bank_account =
							me.form.get_value("bank_account") || "";
						this.get_account_opening_balance();
						this.make_reconciliation_tool();
					},
				},

				{
					fieldtype: "Column Break",
				},
				{
					fieldname: "bank_statement_from_date",
					label: __("Bank Statement From Date"),
					fieldtype: "Date",
					// default: "01-11-2020",
					depends_on: "eval: doc.bank_account",
					change: () => {
						me.form.refresh_dependency();
						if (
							me.bank_statement_from_date !=
							me.form.get_value("bank_statement_from_date")
						) {
							me.bank_statement_from_date =
								me.form.get_value("bank_statement_from_date") ||
								"";
							this.get_account_opening_balance();
							this.make_reconciliation_tool();
						}
					},
				},
				{
					fieldname: "bank_statement_to_date",
					label: __("Bank Statement To Date"),
					fieldtype: "Date",
					depends_on: "eval: doc.bank_statement_from_date",
					// default: "30-11-2020",
					change: () => {
						me.form.refresh_dependency();
						if (
							me.bank_statement_to_date !=
							me.form.get_value("bank_statement_to_date")
						) {
							me.bank_statement_to_date =
								me.form.get_value("bank_statement_to_date") ||
								"";
							this.make_reconciliation_tool();
						}
					},
				},
				{
					fieldtype: "Column Break",
				},
				{
					fieldname: "account_opening_balance",
					label: __("Account Opening Balance"),
					fieldtype: "Currency",
					options: "Currency",
					depends_on: "eval: doc.bank_statement_from_date",
					read_only: 1,
				},
				{
					fieldname: "bank_statement_closing_balance",
					label: __("Bank Statement Closing Balance"),
					fieldtype: "Currency",
					options: "Currency",
					depends_on: "eval: doc.bank_statement_to_date",

					change: () => {
						if (
							me.bank_statement_closing_balance !=
							me.form.get_value("bank_statement_closing_balance")
						) {
							me.bank_statement_closing_balance =
								me.form.get_value(
									"bank_statement_closing_balance"
								) || "";
							this.make_reconciliation_tool();
						}
					},
				},
				{
					fieldtype: "Section Break",
					fieldname: "section_break_1",
					label: __("Reconcile"),
					depends_on: "eval: doc.bank_statement_closing_balance",
				},
				{
					fieldname: "transactions",
					fieldtype: "HTML",
					options: `<div id = "cards"></div>`,
				},
				{
					fieldname: "transactions",
					fieldtype: "HTML",
					options: `<div id = "transactions"></div>`,
				},
				{
					fieldname: "transactions_dt",
					fieldtype: "HTML",
					options: `<div id = "transactions_dt"></div>`,
				},
			],
			body: me.page.body,
		});
		me.form.make();
	}

	make_reconciliation_tool() {
		const me = this;
		$("#cards").empty();
		if (this.bank_account && this.bank_statement_to_date) {
			me.get_account_closing_balance().then(() => {
				if (
					this.bank_account &&
					this.bank_statement_from_date &&
					this.bank_statement_to_date &&
					this.bank_statement_closing_balance
				) {
					me.render_chart();
					// me.render_header();
					me.render();
				}
			});
		}
	}

	get_account_opening_balance() {
		const me = this;
		if (this.bank_account && this.bank_statement_from_date) {
			frappe.call({
				method:
					"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance",
				args: {
					bank_account: this.bank_account,
					till_date: me.bank_statement_from_date,
				},
				callback(response) {
					me.account_opening_balance = response.message;
					me.form.set_value(
						"account_opening_balance",
						me.account_opening_balance
					);
				},
			});
		}
	}

	get_account_closing_balance() {
		const me = this;
		if (this.bank_account && this.bank_statement_to_date) {
			return frappe.call({
				method:
					"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance",
				args: {
					bank_account: this.bank_account,
					till_date: me.bank_statement_to_date,
				},
				callback(response) {
					me.account_closing_balance = response.message;
				},
			});
		}
	}

	render_chart() {
		// $(".report-summary").remove();
		const me = this;
		this.$summary = $(`<div class="report-summary"></div>`)
			.hide()
			.appendTo(this.$cards);
		var chart_data = [
			{
				value: me.bank_statement_closing_balance,
				label: "Statement Ending Balance",
				datatype: "Currency",
				currency: "INR",
			},
			{
				value: me.account_closing_balance,
				label: "Cleared Balance",
				datatype: "Currency",
				currency: "INR",
			},
			{
				indicator:
					me.bank_statement_closing_balance -
					me.account_closing_balance === 0
						? "Green"
						: "Red",
				value:
					me.bank_statement_closing_balance -
					me.account_closing_balance,
				label: "Difference",
				datatype: "Currency",
				currency: "INR",
			},
		];

		chart_data.forEach((summary) => {
			frappe.widget.utils
				.build_summary_item(summary)
				.appendTo(this.$summary);
		});
		this.$summary.css("border-bottom", "0px");
		this.$summary.show();
	}


	render() {
		const me = this;
		if (me.bank_account) {
			this.reconciliation_data_table_manager = new erpnext.accounts.ReconciliationDataTableManager(me.bank_account);
		}
	}
};


erpnext.accounts.ReconciliationDataTableManager = class ReconciliationDataTableManager {
	constructor(bank_account) {
		// this.data = data
		this.bank_account = bank_account
		this.make_dt()
	}

	make_dt(){
		const me = this

		frappe.call({
			method:
				"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions",
			args: {
				bank_account: me.bank_account,
			},
			callback(response) {
				me.data = response.message


				const data = [];
				me.data.forEach((row) => {
					data.push([
						row["date"],
						row["description"],
						row["debit"],
						row["credit"],
						row["reference_number"],
						`
						<a class="close" style="font-size: 12px;" data-name = ${row["name"]} >
							<span class="octicon octicon-triangle-down"></span>
						</a>
						`,
					]);
				});
				const columns = [
					"Date",
					"Description",
					"Deposit",
					"Withdrawal",
					"Reference Number",
					{
						name: "",
						id: "",
						editable: false,
						resizable: false,
						sortable: false,
						focusable: false,
						dropdown: false,
						clusterize: true,
						// width: 32,
						format: (value) => {
							$(`.dt-cell__content`)
								.find(`.close`)
								.click(event, function () {
									console.log(
										$(this).attr("data-name")
									);
									me.bank_entry = $(this).attr(
										"data-name"
									);
									me.show_dialog(
										$(this).attr("data-name")
									);
								});
							return value;
						},
					},
				]
				let datatable_options = {
					columns: columns,
					data: data,
					dynamicRowHeight: true,
					checkboxColumn: false,
					inlineFilters: true,
				};

				if (!this.datatable){
				this.datatable = new frappe.DataTable(
					"#transactions_dt",
					datatable_options
				);}
				else{
					this.datatable.refresh(data, columns)
				}
				$(`.dt-scrollable`).css('max-height','calc(100vh - 400px)');
				$(`.dt-scrollable`).on("click", `.close`, function () {
					console.log($(this).attr("data-name"));
					me.bank_entry = $(this).attr("data-name");

					me.show_dialog($(this).attr("data-name"));

					return true;
				});
			},
		});
	}

	show_dialog(data) {
		const me = this;
		// me.data = frappe.get_doc(
		// 	"Bank Transaction",
		// 	data
		// );
		console.log(me.data)

		frappe.call({
			method: "frappe.client.get_value",
			args: {
				"doctype": "Bank Transaction",
				"filters": {
					'name': data
				},
				fieldname : ['date', 'debit', 'credit', 'currency',
				'description', 'name', 'bank_account', 'company',
				'reference_number', 'transaction_id', 'party_type', 'party'],
			},
			callback: function (r) {
				if (r.message != undefined) {
					console.log(r.message)
					me.data = r.message
				}
			}

		}).then(()=>{
		// me.upload_statement_dialog.get_field("bank").refresh()

			frappe.db.get_value(
				"Bank Account",
				me.data.bank_account,
				"account",
				(r) => {
					me.gl_account = r.account;
				}
			);
		})
		frappe
			.xcall(
				"erpnext.accounts.page.bank_reconciliation.bank_reconciliation.get_linked_payments",
				{
					bank_transaction: data,
					freeze: true,
					freeze_message: __("Finding linked payments"),
				}
			)
			.then((result) => {
				me.make_dialog(result);
			});
	}

	make_dialog(data) {
		const me = this;
		me.selected_payment = null;

		const fields = [
			// {
			// 	fieldtype: "Section Break",
			// 	fieldname: "section_break_4",
			// 	label: "Action"
			// },
			{
				label: __('Action'),
				fieldname: 'action',
				fieldtype: 'Select',
				options: `Match Payment Entry\nAdd Payment Entry\nUpdate Bank Transaction`,
				default: 'Match Payment Entry'
			},


			{
				fieldtype: "Section Break",
				fieldname: "section_break_1",
				label: __("Automatic Reconciliation"),
				depends_on: "eval:doc.action=='Match Payment Entry'"
			},
			{
				fieldtype: "HTML",
				fieldname: "payment_proposals",
			},
			{
				fieldtype: "Section Break",
				fieldname: "section_break_2",
				label: __("Search for a payment"),
				depends_on: "eval:doc.action=='Match Payment Entry'"

			},

			{
				fieldtype: "Link",
				fieldname: "payment_doctype",
				options: "DocType",
				label: "Payment DocType",
				get_query: () => {
					return {
						filters: {
							name: [
								"in",
								[
									"Payment Entry",
									"Journal Entry",
									"Sales Invoice",
									"Purchase Invoice",
									"Expense Claim",
								],
							],
						},
					};
				},
			},
			{
				fieldtype: "Column Break",
				fieldname: "column_break_1",
			},
			{
				fieldtype: "Dynamic Link",
				fieldname: "payment_entry",
				options: "payment_doctype",
				label: "Payment Document",
				get_query: () => {
					let dt = this.dialog.fields_dict.payment_doctype.value;
					if (dt === "Payment Entry") {
						return {
							query:
								"erpnext.accounts.page.bank_reconciliation.bank_reconciliation.payment_entry_query",
							filters: {
								bank_account: this.data.bank_account,
								company: this.data.company,
							},
						};
					} else if (dt === "Journal Entry") {
						return {
							query:
								"erpnext.accounts.page.bank_reconciliation.bank_reconciliation.journal_entry_query",
							filters: {
								bank_account: this.data.bank_account,
								company: this.data.company,
							},
						};
					} else if (dt === "Sales Invoice") {
						return {
							query:
								"erpnext.accounts.page.bank_reconciliation.bank_reconciliation.sales_invoices_query",
						};
					} else if (dt === "Purchase Invoice") {
						return {
							filters: [
								[
									"Purchase Invoice",
									"ifnull(clearance_date, '')",
									"=",
									"",
								],
								["Purchase Invoice", "docstatus", "=", 1],
								[
									"Purchase Invoice",
									"company",
									"=",
									this.data.company,
								],
							],
						};
					} else if (dt === "Expense Claim") {
						return {
							filters: [
								[
									"Expense Claim",
									"ifnull(clearance_date, '')",
									"=",
									"",
								],
								["Expense Claim", "docstatus", "=", 1],
								[
									"Expense Claim",
									"company",
									"=",
									this.data.company,
								],
							],
						};
					}
				},
				onchange: function () {
					if (me.selected_payment !== this.value) {
						me.selected_payment = this.value;
						me.display_payment_details(this);
					}
				},
			},
			{
				fieldtype: "Section Break",
				fieldname: "section_break_3",
			},
			{
				fieldtype: "HTML",
				fieldname: "payment_details",
			},

			{
				fieldtype: "Section Break",
				fieldname: "description_section",
				label: "Description",
				collapsible: 1,
				depends_on: "eval:doc.action!='Match Payment Entry'"
			},

			{
				fieldname: "description",
				fieldtype: "Small Text",
				read_only: 1,
				default: me.data.description || 0
			},
			{
				fieldtype: "Section Break",
				fieldname: "references_party",
				label: "References and Party Details",
				depends_on: "eval:doc.action!='Match Payment Entry'"

			},
			{
				fieldname: "reference_number",
				fieldtype: "Data",
				label: "Reference Number",
				default: me.data.reference_number || '',
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
			},

			{
				fieldname: "transaction_id",
				fieldtype: "Data",
				label: "Transaction ID",
				default: me.data.transaction_id || ''
			},
			{
				default: "Today",
				fieldname: "posting_date",
				fieldtype: "Date",
				label: "Posting Date",
				reqd: 1,
				depends_on: "eval:doc.action=='Add Payment Entry'",

			},
			{
				fieldname: "reference_date",
				fieldtype: "Date",
				label: "Cheque/Reference Date",
				depends_on: "eval:doc.action=='Add Payment Entry'",
				reqd: 1,
			   },
			{
				fieldname: "mode_of_payment",
				fieldtype: "Link",
				label: "Mode of Payment",
				options: "Mode of Payment",
				depends_on: "eval:doc.action=='Add Payment Entry'",
			   },
			{
				fieldname: "column_break_7",
				fieldtype: "Column Break",
			},

			{
				fieldname: "party_type",
				fieldtype: "Link",
				label: "Party Type",
				options: "DocType",
				default:  me.data.party_type || ( me.data.credit ? "Customer" : "Supplier"),
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
			},
			{
				fieldname: "party",
				fieldtype: "Dynamic Link",
				label: "Party",
				options: "party_type",
				default: me.data.party || '',
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
			},
			{
				fieldname: "project",
				fieldtype: "Link",
				label: "Project",
				options: "Project",
				depends_on: "eval:doc.action=='Add Payment Entry'",

			   },
			{
				fieldname: "cost_center",
				fieldtype: "Link",
				label: "Cost Center",
				options: "Cost Center",
				depends_on: "eval:doc.action=='Add Payment Entry'",
			},

			{
				fieldname: "update_transaction_button",
				fieldtype: "Button",
				label: "Update Bank Transaction",
				depends_on: "eval:doc.action=='Update Bank Transaction'",
				primary: 1,
				click: () => {
					console.log(me.dialog.get_value("transaction_id"))
					console.log(me.dialog.get_value("reference_number"))
					console.log(me.dialog.get_value("party_type"))
					console.log(me.dialog.get_value("party"))
					// me.make_update_transaction_dialog();
					// me.update_transaction_dialog.show();
					// frappe.db.set_value( 
					// 	"Bank Transaction",
					// 	me.data.name,
					// 	// {
					// 		// "transaction_id" , me.dialog.get_value("transaction_id"),
					// 	// 	"reference_number" : me.dialog.get_value("reference_number"),
					// 		"party_type" , me.dialog.get_value("party_type"),
					// 	// 	"party" : me.dialog.get_value("party"),
					// 	// }
					// )

					frappe.call({
						method:
							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.update_bank_transaction",
						args: {
							bank_transaction : me.data.name,
							transaction_id : me.dialog.get_value("transaction_id"),
							reference_number : me.dialog.get_value("reference_number"),
							party_type : me.dialog.get_value("party_type"),
							party : me.dialog.get_value("party"),
						},
						callback(response) {
							// me.account_opening_balance = response.message;
							// me.form.set_value(
							// 	"account_opening_balance",
							// 	me.account_opening_balance
							// );
						},
					});

				},
			},

			{
				fieldname: "create_new_payment",
				fieldtype: "Button",
				label: "Add Payment Entry",
				primary: 1,
				depends_on: "eval:doc.action=='Add Payment Entry'",
				click: () => {
				console.log(me.data.name)
				console.log(me.dialog.get_value("transaction_id"),)
				console.log(me.dialog.get_value("reference_number"),)
				console.log(me.dialog.get_value("reference_date"),)
				console.log(me.dialog.get_value("party_type"),)
				console.log(me.dialog.get_value("party"),)
				console.log(me.dialog.get_value("posting_date"),)
				console.log(me.dialog.get_value("mode_of_payment"),)
				console.log(me.dialog.get_value("project"),)
				console.log(me.dialog.get_value("cost_center"),)

					frappe.call({
						method:
							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.create_payment_entry_bts",
						args: {
							bank_transaction : me.data.name,
							transaction_id : me.dialog.get_value("transaction_id"),
							reference_number : me.dialog.get_value("reference_number"),
							reference_date : me.dialog.get_value("reference_date"),
							party_type : me.dialog.get_value("party_type"),
							party : me.dialog.get_value("party"),
							posting_date : me.dialog.get_value("posting_date"),
							mode_of_payment : me.dialog.get_value("mode_of_payment"),
							project : me.dialog.get_value("project"),
							cost_center : me.dialog.get_value("cost_center"),
						},
						callback(response) {

						},
					});

				},
			},
		];

		me.dialog = new frappe.ui.Dialog({
			title: __("Reconcile the Bank Transaction"),
			fields: fields,
			size: "large",
		});

		const proposals_wrapper =
			me.dialog.fields_dict.payment_proposals.$wrapper;
		if (data && data.length > 0) {
			proposals_wrapper.show();
			me.dialog.get_field("section_break_1").df.hidden = 0;
			me.dialog.get_field("section_break_1").refresh();
			proposals_wrapper.append(
				frappe.render_template("linked_payment_header")
			);
			data.map((value) => {
				proposals_wrapper.append(
					frappe.render_template("linked_payment_row", value)
				);
			});
		} else {

			me.dialog.get_field("section_break_1").df.hidden = 1;
			me.dialog.get_field("section_break_1").refresh();
		}

		$(me.dialog.body).on("click", ".reconciliation-btn", (e) => {
			const payment_entry = $(e.target).attr("data-name");
			const payment_doctype = $(e.target).attr("data-doctype");
			frappe
				.xcall(
					"erpnext.accounts.page.bank_reconciliation.bank_reconciliation.reconcile",
					{
						bank_transaction: me.bank_entry,
						payment_doctype: payment_doctype,
						payment_name: payment_entry,
					}
				)
				.then((result) => {
					setTimeout(function () {
						me.make_dt()
						// erpnext.accounts.ReconciliationList.refresh();
					}, 2000);
					me.dialog.hide();
				});
		});

		me.dialog.show();
		me.dialog.get_field("section_break_3").df.hidden = 1;
		me.dialog.get_field("section_break_3").refresh();
	}



	display_payment_details(event) {
		const me = this;
		if (event.value) {
			me.dialog.get_field('section_break_3').df.hidden = 0
			me.dialog.get_field('section_break_3').refresh()
			let dt = me.dialog.fields_dict.payment_doctype.value;
			me.dialog.fields_dict["payment_details"].$wrapper.empty();
			frappe.db.get_doc(dt, event.value).then((doc) => {
				let displayed_docs = [];
				let payment = [];
				if (dt === "Payment Entry") {
					payment.currency =
						doc.payment_type == "Receive"
							? doc.paid_to_account_currency
							: doc.paid_from_account_currency;
					payment.doctype = dt;
					payment.posting_date = doc.posting_date;
					payment.party = doc.party;
					payment.reference_no = doc.reference_no;
					payment.reference_date = doc.reference_date;
					payment.paid_amount = doc.paid_amount;
					payment.name = doc.name;
					displayed_docs.push(payment);
				} else if (dt === "Journal Entry") {
					doc.accounts.forEach((payment) => {
						if (payment.account === me.gl_account) {
							payment.doctype = dt;
							payment.posting_date = doc.posting_date;
							payment.party = doc.pay_to_recd_from;
							payment.reference_no = doc.cheque_no;
							payment.reference_date = doc.cheque_date;
							payment.currency = payment.account_currency;
							payment.paid_amount =
								payment.credit > 0
									? payment.credit
									: payment.debit;
							payment.name = doc.name;
							displayed_docs.push(payment);
						}
					});
				} else if (dt === "Sales Invoice") {
					doc.payments.forEach((payment) => {
						if (
							payment.clearance_date === null ||
							payment.clearance_date === ""
						) {
							payment.doctype = dt;
							payment.posting_date = doc.posting_date;
							payment.party = doc.customer;
							payment.reference_no = doc.remarks;
							payment.currency = doc.currency;
							payment.paid_amount = payment.amount;
							payment.name = doc.name;
							displayed_docs.push(payment);
						}
					});
				}

				const details_wrapper =
					me.dialog.fields_dict.payment_details.$wrapper;
				details_wrapper.append(
					frappe.render_template("linked_payment_header")
				);
				displayed_docs.forEach((payment) => {
					details_wrapper.append(
						frappe.render_template("linked_payment_row", payment)
					);
				});
			});
		}
	}
}