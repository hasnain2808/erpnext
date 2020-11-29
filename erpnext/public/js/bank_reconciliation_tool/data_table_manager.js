frappe.provide("erpnext.accounts");

erpnext.accounts.BankReconciliationDataTableManager = class BankReconciliationDataTableManager {
	constructor(
		company,
		bank_account,
		$reconciliation_tool_dt,
		bank_statement_from_date,
		bank_statement_to_date,
		bank_statement_closing_balance,
		cards_manager
	) {
		// this.data = data
		this.bank_account = bank_account;
		this.company = company;
		this.$reconciliation_tool_dt = $reconciliation_tool_dt;
		this.bank_statement_from_date = bank_statement_from_date;
		this.bank_statement_to_date = bank_statement_to_date;
		this.bank_statement_closing_balance = bank_statement_closing_balance;
		this.cards_manager = cards_manager;
		this.dialog_manager = new erpnext.accounts.BankReconciliationDialogManager(
			this.company,
			this.bank_account
		);
		this.make_dt();
	}

	make_dt() {
		const me = this;

		frappe.call({
			method:
				"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions",
			args: {
				bank_account: me.bank_account,
			},
			callback: function (response) {
				me.format_data(response.message);
				me.get_dt_columns();
				me.get_dt_options();
				me.get_datatable();
				me.set_datatable_style();
				me.set_listeners();
			},
		});
	}

	get_dt_columns() {
		this.columns = [
			{
				name: "Date",
				editable: false,
			},
			{
				name: "Deposit",
				editable: false,
			},
			{
				name: "Withdrawal",
				editable: false,
			},
			{
				name: "Party Type",
				editable: false,
			},
			{
				name: "Party",
				editable: false,
			},
			{
				name: "Description",
				editable: false,
			},
			{
				name: "Reference Number",
				editable: false,
			},
			{
				name: "Transaction Id",
				editable: false,
			},
			{
				name: "A",
				editable: false,
				resizable: false,
				sortable: false,
				focusable: false,
				dropdown: false,
			},
		];
	}

	format_data(transactions) {
		this.transactions = [];
		transactions.forEach((row) => {
			this.transactions.push([
				row["date"],
				row["debit"],
				row["credit"],
				row["party_type"],
				row["party"],
				row["description"],
				row["reference_number"],
				row["transaction_id"],
				`
				<a class="close" style="font-size: 12px;" data-name = ${row["name"]} >
					<span class="octicon octicon-triangle-down"></span>
				</a>
				`,
			]);
		});
	}

	get_dt_options() {
		const me = this;
		me.datatable_options = {
			columns: me.columns,
			data: me.transactions,
			dynamicRowHeight: true,
			checkboxColumn: false,
			inlineFilters: true,
		};
	}

	get_datatable() {
		const me = this;
		if (!me.datatable) {
			me.datatable = new frappe.DataTable(
				me.$reconciliation_tool_dt.get(0),
				me.datatable_options
			);
		} else {
			me.datatable.refresh(me.transactions, me.columns);
		}
	}

	set_datatable_style() {
		$(`.dt-scrollable`).css("max-height", "calc(100vh - 400px)");
	}

	set_listeners() {
		console.log("listener set");
		var me = this
		$(`.dt-scrollable`).on("click", `.close`, function () {
			console.log("inside listener");
			// me.bank_entry = $(this).attr("data-name");
			me.dialog_manager.show_dialog($(this).attr("data-name"),
			() => me.update_dt_cards()
			);
			return true;
		});
	}

	update_dt_cards(result) {
		const me = this
		me.make_dt();
		me.get_cleared_balance().then(() => {
			me.cards_manager.$cards[1].set_value(
				format_currency(me.cleared_balance),
				me.currency
			);
			me.cards_manager.$cards[2].set_value(
				format_currency(
					me.bank_statement_closing_balance - me.cleared_balance
				),
				me.currency
			);
			me.cards_manager.$cards[2].set_indicator(
				me.bank_statement_closing_balance - me.cleared_balance == 0
					? "green"
					: "red"
			);
		});
	}

	// show_dialog(data) {
	// 	const me = this;
	// 	console.log(me.data);

	// 	frappe
	// 		.call({
	// 			method: "frappe.client.get_value",
	// 			args: {
	// 				doctype: "Bank Transaction",
	// 				filters: {name: data},
	// 				fieldname: [ "date", "debit", "credit", "currency", "description", "name", "bank_account", "company", "reference_number", "transaction_id", "party_type", "party"],
	// 			},
	// 			callback: function (r) {
	// 				if (r.message) {
	// 					me.data = r.message;
	// 				}
	// 			},
	// 		})
	// 		.then(() => {
	// 			// me.upload_statement_dialog.get_field("bank").refresh()

	// 			frappe.db.get_value(
	// 				"Bank Account",
	// 				me.data.bank_account,
	// 				"account",
	// 				(r) => {
	// 					me.gl_account = r.account;
	// 				}
	// 			);
	// 		});
	// 	frappe.call({
	// 		method:
	// 			"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_linked_payments",
	// 		args: {
	// 			bank_transaction: data,
	// 			async:false,
	// 			freeze: true,
	// 			freeze_message: __("Finding linked payments"),
	// 		},

	// 		callback: (result) => {
	// 			this.dialog.show_dialog(result);
	// 		},
	// 	});
	// }

	// make_dialog(data) {
	// 	data = data.message
	// 	const me = this;
	// 	me.selected_payment = null;

	// 	const fields = [
	// 		{
	// 			label: __("Action"),
	// 			fieldname: "action",
	// 			fieldtype: "Select",
	// 			options: `Match Payment Entry\nAdd Payment Entry\nUpdate Bank Transaction`,
	// 			default: "Match Payment Entry",
	// 		},

	// 		{
	// 			fieldtype: "Section Break",
	// 			fieldname: "section_break_1",
	// 			label: __("Automatic Reconciliation"),
	// 			depends_on: "eval:doc.action=='Match Payment Entry'",
	// 		},
	// 		{
	// 			fieldtype: "HTML",
	// 			fieldname: "payment_proposals",
	// 		},
	// 		{
	// 			fieldtype: "Section Break",
	// 			fieldname: "section_break_2",
	// 			label: __("Search for a payment"),
	// 			depends_on: "eval:doc.action=='Match Payment Entry'",
	// 		},

	// 		{
	// 			fieldtype: "Link",
	// 			fieldname: "payment_doctype",
	// 			options: "DocType",
	// 			label: "Payment DocType",
	// 			get_query: () => {
	// 				return {
	// 					filters: {
	// 						name: [
	// 							"in",
	// 							[
	// 								"Payment Entry",
	// 								"Journal Entry",
	// 								"Sales Invoice",
	// 								"Purchase Invoice",
	// 								"Expense Claim",
	// 							],
	// 						],
	// 					},
	// 				};
	// 			},
	// 		},
	// 		{
	// 			fieldtype: "Column Break",
	// 			fieldname: "column_break_1",
	// 		},
	// 		{
	// 			fieldtype: "Dynamic Link",
	// 			fieldname: "payment_entry",
	// 			options: "payment_doctype",
	// 			label: "Payment Document",
	// 			get_query: () => {
	// 				let dt = this.dialog.fields_dict.payment_doctype.value;
	// 				if (dt === "Payment Entry") {
	// 					return {
	// 						query:
	// 							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.payment_entry_query",
	// 						filters: {
	// 							bank_account: this.data.bank_account,
	// 							company: this.data.company,
	// 						},
	// 					};
	// 				} else if (dt === "Journal Entry") {
	// 					return {
	// 						query:
	// 							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.journal_entry_query",
	// 						filters: {
	// 							bank_account: this.data.bank_account,
	// 							company: this.data.company,
	// 						},
	// 					};
	// 				} else if (dt === "Sales Invoice") {
	// 					return {
	// 						query:
	// 							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.sales_invoices_query",
	// 					};
	// 				} else if (dt === "Purchase Invoice") {
	// 					return {
	// 						filters: [
	// 							[
	// 								"Purchase Invoice",
	// 								"ifnull(clearance_date, '')",
	// 								"=",
	// 								"",
	// 							],
	// 							["Purchase Invoice", "docstatus", "=", 1],
	// 							[
	// 								"Purchase Invoice",
	// 								"company",
	// 								"=",
	// 								this.data.company,
	// 							],
	// 						],
	// 					};
	// 				} else if (dt === "Expense Claim") {
	// 					return {
	// 						filters: [
	// 							[
	// 								"Expense Claim",
	// 								"ifnull(clearance_date, '')",
	// 								"=",
	// 								"",
	// 							],
	// 							["Expense Claim", "docstatus", "=", 1],
	// 							[
	// 								"Expense Claim",
	// 								"company",
	// 								"=",
	// 								this.data.company,
	// 							],
	// 						],
	// 					};
	// 				}
	// 			},
	// 			onchange: function () {
	// 				if (me.selected_payment !== this.value) {
	// 					me.selected_payment = this.value;
	// 					me.display_payment_details(this);
	// 				}
	// 			},
	// 		},
	// 		{
	// 			fieldtype: "Section Break",
	// 			fieldname: "section_break_3",
	// 		},
	// 		{
	// 			fieldtype: "HTML",
	// 			fieldname: "payment_details",
	// 		},

	// 		{
	// 			fieldtype: "Section Break",
	// 			fieldname: "description_section",
	// 			label: "Description",
	// 			collapsible: 1,
	// 			depends_on: "eval:doc.action!='Match Payment Entry'",
	// 		},

	// 		{
	// 			fieldname: "description",
	// 			fieldtype: "Small Text",
	// 			read_only: 1,
	// 			default: me.data.description || 0,
	// 		},
	// 		{
	// 			fieldtype: "Section Break",
	// 			fieldname: "references_party",
	// 			label: "References and Party Details",
	// 			depends_on: "eval:doc.action!='Match Payment Entry'",
	// 		},
	// 		{
	// 			fieldname: "reference_number",
	// 			fieldtype: "Data",
	// 			label: "Reference Number",
	// 			default: me.data.reference_number || "",
	// 			mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
	// 		},

	// 		{
	// 			fieldname: "transaction_id",
	// 			fieldtype: "Data",
	// 			label: "Transaction ID",
	// 			default: me.data.transaction_id || "",
	// 		},
	// 		{
	// 			default: "Today",
	// 			fieldname: "posting_date",
	// 			fieldtype: "Date",
	// 			label: "Posting Date",
	// 			reqd: 1,
	// 			depends_on: "eval:doc.action=='Add Payment Entry'",
	// 		},
	// 		{
	// 			fieldname: "reference_date",
	// 			fieldtype: "Date",
	// 			label: "Cheque/Reference Date",
	// 			depends_on: "eval:doc.action=='Add Payment Entry'",
	// 			reqd: 1,
	// 		},
	// 		{
	// 			fieldname: "mode_of_payment",
	// 			fieldtype: "Link",
	// 			label: "Mode of Payment",
	// 			options: "Mode of Payment",
	// 			depends_on: "eval:doc.action=='Add Payment Entry'",
	// 		},
	// 		{
	// 			fieldname: "column_break_7",
	// 			fieldtype: "Column Break",
	// 		},

	// 		{
	// 			fieldname: "party_type",
	// 			fieldtype: "Link",
	// 			label: "Party Type",
	// 			options: "DocType",
	// 			default:
	// 				me.data.party_type ||
	// 				(me.data.credit ? "Customer" : "Supplier"),
	// 			mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
	// 		},
	// 		{
	// 			fieldname: "party",
	// 			fieldtype: "Dynamic Link",
	// 			label: "Party",
	// 			options: "party_type",
	// 			default: me.data.party || "",
	// 			mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
	// 		},
	// 		{
	// 			fieldname: "project",
	// 			fieldtype: "Link",
	// 			label: "Project",
	// 			options: "Project",
	// 			depends_on: "eval:doc.action=='Add Payment Entry'",
	// 		},
	// 		{
	// 			fieldname: "cost_center",
	// 			fieldtype: "Link",
	// 			label: "Cost Center",
	// 			options: "Cost Center",
	// 			depends_on: "eval:doc.action=='Add Payment Entry'",
	// 		},

	// 		{
	// 			fieldname: "update_transaction_button",
	// 			fieldtype: "Button",
	// 			label: "Update Bank Transaction",
	// 			depends_on: "eval:doc.action=='Update Bank Transaction'",
	// 			primary: 1,
	// 			click: () => {
	// 				const me = this

	// 				frappe.call({
	// 					method:
	// 						"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.update_bank_transaction",
	// 					args: {
	// 						bank_transaction: me.data.name,
	// 						transaction_id: me.dialog.get_value(
	// 							"transaction_id"
	// 						),
	// 						reference_number: me.dialog.get_value(
	// 							"reference_number"
	// 						),
	// 						party_type: me.dialog.get_value("party_type"),
	// 						party: me.dialog.get_value("party"),
	// 					},
	// 					callback(response) {
	// 						me.make_dt();
	// 						me.dialog.hide()
	// 					},
	// 				});
	// 			},
	// 		},

	// 		{
	// 			fieldname: "create_new_payment",
	// 			fieldtype: "Button",
	// 			label: "Add Payment Entry",
	// 			primary: 1,
	// 			depends_on: "eval:doc.action=='Add Payment Entry'",
	// 			click: () => {
	// 				frappe.call({
	// 					method:
	// 						"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.create_payment_entry_bts",
	// 					args: {
	// 						bank_transaction: me.data.name,
	// 						transaction_id: me.dialog.get_value(
	// 							"transaction_id"
	// 						),
	// 						reference_number: me.dialog.get_value(
	// 							"reference_number"
	// 						),
	// 						reference_date: me.dialog.get_value(
	// 							"reference_date"
	// 						),
	// 						party_type: me.dialog.get_value("party_type"),
	// 						party: me.dialog.get_value("party"),
	// 						posting_date: me.dialog.get_value("posting_date"),
	// 						mode_of_payment: me.dialog.get_value(
	// 							"mode_of_payment"
	// 						),
	// 						project: me.dialog.get_value("project"),
	// 						cost_center: me.dialog.get_value("cost_center"),
	// 					},
	// 					callback(response) {
	// 						me.make_dt()
	// 						me.dialog.hide()
	// 					},
	// 				});
	// 			},
	// 		},
	// 	];

	// 	me.dialog = new frappe.ui.Dialog({
	// 		title: __("Reconcile the Bank Transaction"),
	// 		fields: fields,
	// 		size: "large",
	// 	});

	// 	const proposals_wrapper =
	// 		me.dialog.fields_dict.payment_proposals.$wrapper;
	// 	if (data && data.length > 0) {
	// 		proposals_wrapper.show();
	// 		me.dialog.get_field("section_break_1").df.hidden = 0;
	// 		me.dialog.get_field("section_break_1").refresh();
	// 		proposals_wrapper.append(
	// 			frappe.render_template("linked_payment_header")
	// 		);
	// 		data.map((value) => {
	// 			proposals_wrapper.append(
	// 				frappe.render_template("linked_payment_row", value)
	// 			);
	// 		});
	// 	} else {
	// 		me.dialog.get_field("section_break_1").df.hidden = 1;
	// 		me.dialog.get_field("section_break_1").refresh();
	// 	}

	// 	$(me.dialog.body).on("click", ".reconciliation-btn", (e) => {
	// 		const payment_entry = $(e.target).attr("data-name");
	// 		const payment_doctype = $(e.target).attr("data-doctype");
	// 		frappe.call({
	// 			method:
	// 				"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.reconcile",
	// 			args: {
	// 				bank_transaction: me.bank_entry,
	// 				payment_doctype: payment_doctype,
	// 				payment_name: payment_entry,
	// 			},
	// 			callback: (result) => {
	// 					me.make_dt();
	// 					me.get_cleared_balance().then(() => {
	// 						me.cards_manager.$cards[1].set_value(
	// 							format_currency(me.cleared_balance),
	// 							me.currency
	// 						);
	// 						me.cards_manager.$cards[2].set_value(
	// 							format_currency(
	// 								me.bank_statement_closing_balance -
	// 									me.cleared_balance
	// 							),
	// 							me.currency
	// 						);
	// 						me.cards_manager.$cards[2].set_indicator(
	// 							me.bank_statement_closing_balance -
	// 								me.cleared_balance ==
	// 								0
	// 								? "green"
	// 								: "red"
	// 						);
	// 					});
	// 				me.dialog.hide();
	// 			},
	// 		});
	// 	});
	// 	me.dialog.show();
	// 	me.dialog.get_field("section_break_3").df.hidden = 1;
	// 	me.dialog.get_field("section_break_3").refresh();
	// }

	// display_payment_details(event) {
	// 	const me = this;
	// 	if (event.value) {
	// 		me.dialog.get_field("section_break_3").df.hidden = 0;
	// 		me.dialog.get_field("section_break_3").refresh();
	// 		let dt = me.dialog.fields_dict.payment_doctype.value;
	// 		me.dialog.fields_dict["payment_details"].$wrapper.empty();
	// 		frappe.db.get_doc(dt, event.value).then((doc) => {
	// 			let displayed_docs = [];
	// 			let payment = [];
	// 			if (dt === "Payment Entry") {
	// 				payment.currency =
	// 					doc.payment_type == "Receive"
	// 						? doc.paid_to_account_currency
	// 						: doc.paid_from_account_currency;
	// 				payment.doctype = dt;
	// 				payment.posting_date = doc.posting_date;
	// 				payment.party = doc.party;
	// 				payment.reference_no = doc.reference_no;
	// 				payment.reference_date = doc.reference_date;
	// 				payment.paid_amount = doc.paid_amount;
	// 				payment.name = doc.name;
	// 				displayed_docs.push(payment);
	// 			} else if (dt === "Journal Entry") {
	// 				doc.accounts.forEach((payment) => {
	// 					if (payment.account === me.gl_account) {
	// 						payment.doctype = dt;
	// 						payment.posting_date = doc.posting_date;
	// 						payment.party = doc.pay_to_recd_from;
	// 						payment.reference_no = doc.cheque_no;
	// 						payment.reference_date = doc.cheque_date;
	// 						payment.currency = payment.account_currency;
	// 						payment.paid_amount =
	// 							payment.credit > 0
	// 								? payment.credit
	// 								: payment.debit;
	// 						payment.name = doc.name;
	// 						displayed_docs.push(payment);
	// 					}
	// 				});
	// 			} else if (dt === "Sales Invoice") {
	// 				doc.payments.forEach((payment) => {
	// 					if (
	// 						payment.clearance_date === null ||
	// 						payment.clearance_date === ""
	// 					) {
	// 						payment.doctype = dt;
	// 						payment.posting_date = doc.posting_date;
	// 						payment.party = doc.customer;
	// 						payment.reference_no = doc.remarks;
	// 						payment.currency = doc.currency;
	// 						payment.paid_amount = payment.amount;
	// 						payment.name = doc.name;
	// 						displayed_docs.push(payment);
	// 					}
	// 				});
	// 			}

	// 			const details_wrapper =
	// 				me.dialog.fields_dict.payment_details.$wrapper;
	// 			details_wrapper.append(
	// 				frappe.render_template("linked_payment_header")
	// 			);
	// 			displayed_docs.forEach((payment) => {
	// 				details_wrapper.append(
	// 					frappe.render_template("linked_payment_row", payment)
	// 				);
	// 			});
	// 		});
	// 	}
	// }

	get_cleared_balance() {
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
					me.cleared_balance = response.message;
				},
			});
		}
	}
};

erpnext.accounts.BankReconciliationDialogManager = class BankReconciliationDialogManager {
	constructor(company, bank_account) {
		this.bank_account = bank_account;
		this.company = company;
		this.make_dialog();
	}

	show_dialog(bank_transaction_name, update_dt_cards) {
		var me = this;
		me.update_dt_cards = update_dt_cards;
		frappe.call({
			method: "frappe.client.get_value",
			args: {
				doctype: "Bank Transaction",
				filters: { name: bank_transaction_name },
				fieldname: [
					"date",
					"debit",
					"credit",
					"currency",
					"description",
					"name",
					"bank_account",
					"company",
					"reference_number",
					"transaction_id",
					"party_type",
					"party",
				],
			},
			callback: (r) => {
				if (r.message) {
					me.bank_transaction = r.message;
					me.set_fields(r.message);
					me.dialog.show();
				}
			},
		});

		frappe.call({
			method:
				"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_linked_payments",
			args: {
				bank_transaction: bank_transaction_name,
				async: false,
				freeze: true,
				freeze_message: __("Finding linked payments"),
			},

			callback: (result) => {
				const data = result.message;

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
					console.log(payment_entry, payment_doctype);
					frappe.call({
						method:
							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.reconcile",
						args: {
							bank_transaction: this.bank_transaction.name,
							payment_doctype: payment_doctype,
							payment_name: payment_entry,
						},
						callback: (result) => {
							// me.make_dt();
							// me.get_cleared_balance().then(() => {
							// 	me.cards_manager.$cards[1].set_value(
							// 		format_currency(me.cleared_balance),
							// 		me.currency
							// 	);
							// 	me.cards_manager.$cards[2].set_value(
							// 		format_currency(
							// 			me.bank_statement_closing_balance -
							// 				me.cleared_balance
							// 		),
							// 		me.currency
							// 	);
							// 	me.cards_manager.$cards[2].set_indicator(
							// 		me.bank_statement_closing_balance -
							// 			me.cleared_balance ==
							// 			0
							// 			? "green"
							// 			: "red"
							// 	);
							// });
							me.update_dt_cards();
							me.dialog.hide();
						},
					});
				});
				me.dialog.show();
				me.dialog.get_field("section_break_3").df.hidden = 1;
				me.dialog.get_field("section_break_3").refresh();
			},
		});
	}

	set_fields(bank_transaction) {
		this.dialog.set_values(bank_transaction);
	}

	make_dialog() {
		// data = data.message
		const me = this;
		me.selected_payment = null;

		const fields = [
			{
				label: __("Action"),
				fieldname: "action",
				fieldtype: "Select",
				options: `Match Payment Entry\nAdd Payment Entry\nUpdate Bank Transaction`,
				default: "Match Payment Entry",
			},

			{
				fieldtype: "Section Break",
				fieldname: "section_break_1",
				label: __("Automatic Reconciliation"),
				depends_on: "eval:doc.action=='Match Payment Entry'",
			},
			{
				fieldtype: "HTML",
				fieldname: "payment_proposals",
			},
			{
				fieldtype: "Section Break",
				fieldname: "section_break_2",
				label: __("Search for a payment"),
				depends_on: "eval:doc.action=='Match Payment Entry'",
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
								"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.payment_entry_query",
							filters: {
								bank_account: this.bank_account,
								company: this.company,
							},
						};
					} else if (dt === "Journal Entry") {
						return {
							query:
								"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.journal_entry_query",
							filters: {
								bank_account: this.bank_account,
								company: this.company,
							},
						};
					} else if (dt === "Sales Invoice") {
						return {
							query:
								"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.sales_invoices_query",
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
									this.company,
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
								["Expense Claim", "company", "=", this.company],
							],
						};
					}
				},
				onchange: function () {
					if (me.selected_payment !== this.value) {
						console.log(this.value);
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
				depends_on: "eval:doc.action!='Match Payment Entry'",
			},

			{
				fieldname: "description",
				fieldtype: "Small Text",
				read_only: 1,
				// default: me.data.description || 0,
			},
			{
				fieldtype: "Section Break",
				fieldname: "references_party",
				label: "References and Party Details",
				depends_on: "eval:doc.action!='Match Payment Entry'",
			},
			{
				fieldname: "reference_number",
				fieldtype: "Data",
				label: "Reference Number",
				// default: me.data.reference_number || "",
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
			},

			{
				fieldname: "transaction_id",
				fieldtype: "Data",
				label: "Transaction ID",
				// default: me.data.transaction_id || "",
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
				// default:
				// 	me.data.party_type ||
				// 	(me.data.credit ? "Customer" : "Supplier"),
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
			},
			{
				fieldname: "party",
				fieldtype: "Dynamic Link",
				label: "Party",
				options: "party_type",
				// default: me.data.party || "",
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
					const me = this;

					frappe.call({
						method:
							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.update_bank_transaction",
						args: {
							bank_transaction: me.bank_transaction.name,
							transaction_id: me.dialog.get_value(
								"transaction_id"
							),
							reference_number: me.dialog.get_value(
								"reference_number"
							),
							party_type: me.dialog.get_value("party_type"),
							party: me.dialog.get_value("party"),
						},
						callback(response) {
							me.update_dt_cards();
							me.dialog.hide();
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
					frappe.call({
						method:
							"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.create_payment_entry_bts",
						args: {
							bank_transaction: me.bank_transaction.name,
							transaction_id: me.dialog.get_value(
								"transaction_id"
							),
							reference_number: me.dialog.get_value(
								"reference_number"
							),
							reference_date: me.dialog.get_value(
								"reference_date"
							),
							party_type: me.dialog.get_value("party_type"),
							party: me.dialog.get_value("party"),
							posting_date: me.dialog.get_value("posting_date"),
							mode_of_payment: me.dialog.get_value(
								"mode_of_payment"
							),
							project: me.dialog.get_value("project"),
							cost_center: me.dialog.get_value("cost_center"),
						},
						callback(response) {
							me.update_dt_cards();
							me.dialog.hide();
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
	}

	display_payment_details(event) {
		const me = this;
		if (event.value) {
			me.dialog.get_field("section_break_3").df.hidden = 0;
			me.dialog.get_field("section_break_3").refresh();
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
