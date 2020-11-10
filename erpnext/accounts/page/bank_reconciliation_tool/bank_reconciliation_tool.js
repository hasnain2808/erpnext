frappe.provide("erpnext.accounts");
frappe.provide('frappe.widget.utils');

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
		this.upload_statement_button = this.page.set_secondary_action(__("Upload a Statement"), ()=>{
			this.upload_statement_dialog.show()
		})

		this.parent = wrapper;
		this.page = this.parent.page;
		this.make_upload_statement_dialog();
		this.make_form();
		this.$result = $("#transactions");
		this.$cards = $("#cards");

	}

	make_upload_statement_dialog(){
		const fields = [

			{
				fieldtype: "Link",
				fieldname: "company",
				label: __("Company"),
				options: "Company",
				change: () => {
					this.upload_statement_dialog.get_field("import_bank_transactions").df.hidden=0;
					this.upload_statement_dialog.get_field("import_bank_transactions").refresh();
					// console.log(t)
					// if (!this.upload_statement_dialog.get_value("company"))
					// $("[data-fieldname=upload_statement_dialog]").hide()
					// 		else
					// 		$("[data-fieldname=upload_statement_dialog]").show()

				}
			},

			{
				fieldtype: "Data",
				fieldname: "bank_account",
				label: __("Bank Account"),
				options: "Bank Account",
				get_query: () => {
					return {
						filters: {
							company: [
								"in",
								[this.upload_statement_dialog.get_value("company") || ""],
							],
						},
					};
				},

			},
			{
				fieldtype: "Attach",
				fieldname: "import_bank_transactions",
				label: __("Import Bank Transactions"),
				hidden:1,
				change: () => {
					this.show_preview()
				}
				// get_query: () => {
				// 	return {
				// 		filters: {
				// 			company: [
				// 				"in",
				// 				[this.upload_statement_dialog.get_value("company") || ""],
				// 			],
				// 		},
				// 	};
				// }
			},
			{
				fieldname: "import_log",
				fieldtype: "Code",
				label: "Import Log",
				options: "JSON"
			   },
			{
				fieldname: "import_preview",
				fieldtype: "HTML",
				label: "Import Preview"
			   },
			//    {
			// 	fieldname: "template_options",
			// 	fieldtype: "Code",
			// 	hidden: 1,
			// 	label: "Template Options",
			// 	options: "JSON",
			// 	read_only: 1
			//    },
			   {
				fieldname: "data_import_id",
				fieldtype: "Data",
				hidden: 1,
				label: "Data Import ID",
				read_only: 1
			   },

		]
		this.upload_statement_dialog = new frappe.ui.Dialog({
			title: __("Upload Bank statements"),
			fields: fields,
			size: "large",
			primary_action: values => {
				dialog.hide();
			}
		});
	}

	show_preview(){
		const me = this;
		const file_name = me.upload_statement_dialog.get_value("import_bank_transactions")
		const data_import_id = me.upload_statement_dialog.get_value("data_import_id")
		// frm.toggle_display('section_import_preview', frm.has_import_file());
		// if (!frm.has_import_file()) {
		// 	frm.get_field('import_preview').$wrapper.empty();
		// 	return;
		// } else {
		// 	frm.trigger('update_primary_action');
		// }

		// load import preview
		this.upload_statement_dialog.get_field('import_preview').$wrapper.empty();
		$('<span class="text-muted">')
			.html(__('Loading import file...'))
			.appendTo(this.upload_statement_dialog.get_field('import_preview').$wrapper);



		frappe.call({
				method: 'erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_importer_preview',
				args: {
					import_file_path: file_name,
					data_import: data_import_id ,
					template_options: me.template_options
				},
				error: {
					TimestampMismatchError() {
						// ignore this error
					}
				}
			})
			.then(r => {
				let preview_data = r.message["preview"];
				me.upload_statement_dialog.set_value('data_import_id', r.message["import_name"]);
				me.show_import_preview(me.upload_statement_dialog, preview_data)
			});
	}

	show_import_preview(frm, preview_data) {
		const me = this;
		let import_log = JSON.parse(frm.get_value('import_log') || '[]');
;

		if (
			frm.import_preview &&
			frm.import_preview.doctype === frm.get_value('reference_doctype')
		) {
			frm.import_preview.preview_data = preview_data;
			frm.import_preview.import_log = import_log;
			frm.import_preview.refresh();
			return;
		}
		frappe.require('/assets/js/data_import_tools.min.js', () => {
			frm.import_preview = new frappe.data_import.ImportPreview({
				wrapper: frm.get_field('import_preview').$wrapper,
				doctype: "Bank Transaction",
				preview_data,
				import_log,
				frm,
				events: {
					remap_column(changed_map) {
						console.log(changed_map)
						let template_options = JSON.parse(me.template_options || '{}');
						console.log(frm.get_value('template_options'))
						template_options.column_to_field_map = template_options.column_to_field_map || {};
						Object.assign(template_options.column_to_field_map, changed_map);
						console.log(template_options.column_to_field_map)
						me.template_options = JSON.stringify(template_options);
						console.log(me.template_options)
						console.log(me.template_options)
						me.show_preview()
					}
				}
			});
		});
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
						me.bank_account =
						me.form.get_value("bank_account") || "";
						this.get_account_opening_balance()
					},
				},

				{
					fieldtype: "Column Break",
				},
				{
					fieldname: "bank_statement_from_date",
					label: __("Bank Statement From Date"),
					fieldtype: "Date",
					change: () => {
						if (me.bank_statement_from_date != me.form.get_value("bank_statement_from_date")) {
							me.bank_statement_from_date =
								me.form.get_value(
									"bank_statement_from_date"
								) || "";
								this.get_account_opening_balance()
							}
					},
				},
				{
					fieldname: "bank_statement_to_date",
					label: __("Bank Statement To Date"),
					fieldtype: "Date",
					change: () => {
						if (me.bank_statement_to_date != me.form.get_value("bank_statement_to_date")) {
							me.bank_statement_to_date =
								me.form.get_value(
									"bank_statement_to_date"
								) || "";
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
					read_only: 1,
				},
				{
					fieldname: "bank_statement_closing_balance",
					label: __("Bank Statement Closing Balance"),
					fieldtype: "Currency",
					options: "Currency",
					change: () => {
						if (me.bank_statement_closing_balance != me.form.get_value("bank_statement_closing_balance")) {

							me.bank_statement_closing_balance =
								me.form.get_value(
									"bank_statement_closing_balance"
								) || "";
								this.make_reconciliation_tool()
						}

					},
				},
				{
					fieldtype: "Section Break",
					fieldname: "section_break_1",
					label: __("Reconcile"),
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

			],
			body: me.page.body,
		});
		me.form.make();
	}

	get_selected_statement_data(statement) {
		const me = this;
		if (statement) {
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Bank Statement",
					name: statement,
				},
				callback(r) {
					if (r.message) {
						let selected_bank_statement = r.message;
						me.bank_statement_from_date = selected_bank_statement.from_date;
						me.bank_statement_to_date = selected_bank_statement.to_date;
						me.bank_statement_opening_balance =
							selected_bank_statement.opening_balance;
						me.bank_statement_closing_balance =
							selected_bank_statement.closing_balance;

						me.form.set_value(
							"bank_statement_from_date",
							me.bank_statement_from_date
						);
						me.form.set_value(
							"bank_statement_to_date",
							me.bank_statement_to_date
						);
						me.form.set_value(
							"bank_statement_opening_balance",
							me.bank_statement_opening_balance
						);
						me.form.set_value(
							"bank_statement_closing_balance",
							me.bank_statement_closing_balance
						);
					}
				},
			});
		}
	}

	make_reconciliation_tool() {
		const me = this;
		$("#transactions").empty();
		$("#cards").empty();
		// this.get_bank_balance()
		me.get_account_closing_balance().then( () => {
			me.render_chart();
			me.render_header();
			me.render();
			$("#cards").scrollTop()
		});
	}

	get_account_opening_balance() {
		const me = this
		if (this.bank_account && this.bank_statement_from_date){
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
		const me = this
		if (this.bank_account && this.bank_statement_from_date){
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
				indicator: me.bank_statement_closing_balance - me.account_closing_balance?"Green" : "Red" ,
				value: me.bank_statement_closing_balance - me.account_closing_balance,
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
		this.$summary.show();
	}

	render() {
		const me = this;
		if (me.bank_account) {
			return frappe.call({
				method:
					"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions",
				args: {
					// from_date: me.from_date,
					// to_date: me.to_date,
					bank_account: me.bank_account,
				},
				callback(response) {
					me.data = response.message;
					me.data.map((value) => {
						const row = $('<div class="list-row-container">')
							.data("data", value)
							.appendTo(me.$result)
							.get(0);
						new erpnext.accounts.ReconciliationRow(row, value);
					});
				},
			});
		}
	}

	render_header() {
		const me = this;
		// $(".transaction-header").remove();
		if ($(this.wrapper).find(".transaction-header").length === 0) {
			me.$result.append(
				frappe.render_template("bank_transaction_header", {})
			);
		}
	}
};

erpnext.accounts.ReconciliationRow = class ReconciliationRow {
	constructor(row, data) {
		this.data = data;
		this.row = row;
		this.make();
		this.bind_events();
	}

	make() {
		$(this.row).append(
			frappe.render_template("bank_transaction_row", this.data)
		);
	}

	bind_events() {
		const me = this;
		$(me.row).on("click", ".clickable-section", function () {
			me.bank_entry = $(this).attr("data-name");
			me.show_dialog($(this).attr("data-name"));
			// me.make_edit_bank_transaction_dialog($(this).attr("data-name"))
		});

		$(me.row).on("click", ".new-reconciliation", function () {
			me.bank_entry = $(this).attr("data-name");
			me.show_dialog($(this).attr("data-name"));
		});

		$(me.row).on("click", ".new-payment", function () {
			me.bank_entry = $(this).attr("data-name");
			me.new_payment();
		});

		$(me.row).on("click", ".new-invoice", function () {
			me.bank_entry = $(this).attr("data-name");
			me.new_invoice();
		});

		$(me.row).on("click", ".new-expense", function () {
			me.bank_entry = $(this).attr("data-name");
			me.new_expense();
		});
	}

	new_payment() {
		const me = this;
		const paid_amount = me.data.credit > 0 ? me.data.credit : me.data.debit;
		const payment_type = me.data.credit > 0 ? "Receive" : "Pay";
		const party_type = me.data.credit > 0 ? "Customer" : "Supplier";

		frappe.new_doc("Payment Entry", {
			payment_type: payment_type,
			paid_amount: paid_amount,
			party_type: party_type,
			paid_from: me.data.bank_account,
		});
	}

	new_invoice() {
		const me = this;
		const invoice_type =
			me.data.credit > 0 ? "Sales Invoice" : "Purchase Invoice";

		frappe.new_doc(invoice_type);
	}

	new_expense() {
		frappe.new_doc("Expense Claim");
	}

	make_edit_bank_transaction_dialog(data){
		const me = this;

		const fields = [
			{
				fieldname: "date",
				fieldtype: "Date",
				label: "Date"
			},
			{
				fieldname: "bank_account",
				fieldtype: "Link",
				label: "Bank Account",
				options: "Bank Account",
			},
			// {
			// 	fieldname: "name",
			// 	fieldtype: "Name",
			// 	label: "Name"
			// },

				{
					fieldtype: "Column Break",
					fieldname: "column_break_1",
				},
				{
					fieldname: "debit",
					fieldtype: "Currency",
					label: "Debit"
				},
				{
					fieldname: "credit",
					fieldtype: "Currency",
					label: "Credit"
				},
				{
					fieldtype: "Section Break",
					fieldname: "section_break_1",
					label: __("Description"),
				},
				{
					fieldname: "description",
					fieldtype: "Small Text",
					label: "Description"
				},
				{
					fieldname: "party_section",
					fieldtype: "Section Break",
					label: "Party Section"
				},
				{
					fieldname: "party_type",
					fieldtype: "Link",
					label: "Party Type",
					options: "DocType",
				},
				{
					fieldtype: "Column Break",
					fieldname: "column_break_2",
				},
				{
					fieldname: "party",
					fieldtype: "Dynamic Link",
					label: "Party",
					options: "party_type"
				}
		]

		me.edit_bank_transaction_dialog = new frappe.ui.Dialog({
			title: __("Update Bank Transaction"),
			fields: fields,
			size: "large",
		});

		me.edit_bank_transaction_dialog.show();

	}

	show_dialog(data) {
		const me = this;

		frappe.db.get_value(
			"Bank Account",
			me.data.bank_account,
			"account",
			(r) => {
				me.gl_account = r.account;
			}
		);

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

	get_payment_fields(){
		return 			[			{
			fieldname: "description",
			fieldtype: "Small Text",
			read_only: 1
		},{
			fieldname: "party_type",
			fieldtype: "Link",
			label: "Party Type",
			options: "DocType",
		},

		{
			fieldname: "party",
			fieldtype: "Dynamic Link",
			label: "Party",
			options: "party_type"
		},
		{
			fieldname: "reference_number",
			fieldtype: "Data",
			label: "Reference Number",
		},]
	}

	make_new_voucher_dialog(data) {
		const me = this;
		let fields = me.get_payment_fields();
		fields.unshift({
			label: __('Voucher Type'),
			fieldname: 'voucher_type',
			fieldtype: 'Select',
			options: "Payment Entry\nExpense Claim",
		})
		me.new_voucher_dialog = new frappe.ui.Dialog({
			title: __("Create New Voucher"),
			fields: fields,
		});
	}

	make_update_transaction_dialog(data) {
		const me = this;
		let fields = me.get_payment_fields()
		me.update_transaction_dialog = new frappe.ui.Dialog({
			title: __("Create New Voucher"),
			fields: fields,
		});
	}

	make_dialog(data) {
		const me = this;
		me.selected_payment = null;

		const fields = [
			{
				fieldtype: "Section Break",
				fieldname: "section_break_1",
				label: __("Automatic Reconciliation"),
			},
			{
				fieldtype: "HTML",
				fieldname: "payment_proposals",
			},
			{
				fieldtype: "Section Break",
				fieldname: "section_break_2",
				label: __("Search for a payment"),
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

			// {
			// 	fieldtype: "Section Break",
			// 	fieldname: "section_break_3",
			// 	label: "Description",
			// 	"collapsible": 1,

			// },

			// {
			// 	fieldname: "description",
			// 	fieldtype: "Small Text",
			// 	read_only: 1
			// },
			{
				fieldtype: "Section Break",
				fieldname: "section_break_4",
				label: "Update Bank Transaction Create Vouchers",
				"collapsible": 1,

			},
			// {
			// 	fieldname: "party_type",
			// 	fieldtype: "Link",
			// 	label: "Party Type",
			// 	options: "DocType",
			// },

			// {
			// 	fieldname: "party",
			// 	fieldtype: "Dynamic Link",
			// 	label: "Party",
			// 	options: "party_type"
			// },
			// {
			// 	fieldname: "reference_number",
			// 	fieldtype: "Data",
			// 	label: "Reference Number",
			// },

			{
				fieldname: "update_transaction_button",
				fieldtype: "Button",
				label: "Update Transaction",
				click: () => {
					me.make_update_transaction_dialog()
					me.update_transaction_dialog.show()
				}			},
			{
				fieldtype: "Column Break",
				fieldname: "column_break_2",
			},
			{
				fieldname: "create_new_vouchers",
				fieldtype: "Button",
				label: "Create New Vouchers",
				click: () => {
					me.make_new_voucher_dialog()
					me.new_voucher_dialog.show()
				}
			},
			// {
			// 	fieldname: "create_new_expense",
			// 	fieldtype: "Button",
			// 	label: "Create New Expense",
			// 	click: () => {

			// 	}			},
		];

		me.dialog = new frappe.ui.Dialog({
			title: __("Actions"),
			fields: fields,
			size: "large",
		});

		const proposals_wrapper =
			me.dialog.fields_dict.payment_proposals.$wrapper;
		if (data && data.length > 0) {
			proposals_wrapper.append(
				frappe.render_template("linked_payment_header")
			);
			data.map((value) => {
				proposals_wrapper.append(
					frappe.render_template("linked_payment_row", value)
				);
			});
		} else {
			const empty_data_msg = __(
				"ERPNext could not find any matching payment entry"
			);
			proposals_wrapper.append(
				`<div class="text-center"><h5 class="text-muted">${empty_data_msg}</h5></div>`
			);
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
						erpnext.accounts.ReconciliationList.refresh();
					}, 2000);
					me.dialog.hide();
				});
		});

		me.dialog.show();
	}

	display_payment_details(event) {
		const me = this;
		if (event.value) {
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
};
