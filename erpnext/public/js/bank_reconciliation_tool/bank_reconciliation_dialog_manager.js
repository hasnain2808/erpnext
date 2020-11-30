frappe.provide("erpnext.accounts");

erpnext.accounts.BankReconciliationDialogManager = class BankReconciliationDialogManager {
	constructor(company, bank_account) {
		this.bank_account = bank_account;
		this.company = company;
		this.make_dialog();
	}

	show_dialog(bank_transaction_name, update_dt_cards) {
		this.update_dt_cards = update_dt_cards;
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
					"unallocated_amount",
					"allocated_amount",
				],
			},
			callback: (r) => {
				if (r.message) {
					this.bank_transaction = r.message;
					this.set_fields(r.message);
					this.dialog.show();
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

				const proposals_wrapper = this.dialog.fields_dict
					.payment_proposals.$wrapper;
				if (data && data.length > 0) {
					proposals_wrapper.show();
					this.dialog.get_field("section_break_1").df.hidden = 0;
					this.dialog.get_field("section_break_1").refresh();
					proposals_wrapper.append(
						frappe.render_template("linked_payment_header")
					);
					data.map((value) => {
						proposals_wrapper.append(
							frappe.render_template("linked_payment_row", value)
						);
					});
				} else {
					this.dialog.get_field("section_break_1").df.hidden = 1;
					this.dialog.get_field("section_break_1").refresh();
				}
				$(this.dialog.body).on("click", ".reconciliation-btn", (e) => {
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
							this.update_dt_cards();
							this.dialog.hide();
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
				fieldname: "references_party",
				label: "References and Party Details",
				depends_on: "eval:doc.action!='Match Payment Entry'",
			},
			{
				fieldname: "reference_number",
				fieldtype: "Data",
				label: "Reference Number",
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
			},

			{
				fieldname: "transaction_id",
				fieldtype: "Data",
				label: "Transaction ID",
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
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
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
				mandatory_depends_on: "eval:doc.action=='Add Payment Entry'",
			},
			{
				fieldname: "party",
				fieldtype: "Dynamic Link",
				label: "Party",
				options: "party_type",
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
				fieldtype: "Section Break",
				fieldname: "details_section",
				label: "Transaction Details",
				collapsible: 1,
			},
			{
				fieldname: "debit",
				fieldtype: "Currency",
				label: "Debit",
				read_only: 1,
			},
			{
				fieldname: "credit",
				fieldtype: "Currency",
				label: "Credit",
				read_only: 1,
			},
			{
				fieldname: "description",
				fieldtype: "Small Text",
				read_only: 1,
			},
			{
				fieldname: "column_break_17",
				fieldtype: "Column Break",
				read_only: 1,
			},
			{
				fieldname: "allocated_amount",
				fieldtype: "Currency",
				label: "Allocated Amount",
				read_only: 1,
			},

			{
				fieldname: "unallocated_amount",
				fieldtype: "Currency",
				label: "Unallocated Amount",
				read_only: 1,
			},
		];

		me.dialog = new frappe.ui.Dialog({
			title: __("Reconcile the Bank Transaction"),
			fields: fields,
			size: "large",
			primary_action: (values) =>
				this.reconciliation_dialog_primary_action(values),
		});
	}

	reconciliation_dialog_primary_action(values) {
		if (values.action == "Match Payment Entry") return;
		if (values.action == "Add Payment Entry")
			this.add_payment_entry(values);
		else if (values.action == "Update Bank Transaction")
			this.update_transaction(values);
	}

	add_payment_entry(values) {
		frappe.call({
			method:
				"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.create_payment_entry_bts",
			args: {
				bank_transaction: this.bank_transaction.name,
				transaction_id: values.transaction_id,
				reference_number: values.reference_number,
				reference_date: values.reference_date,
				party_type: values.party_type,
				party: values.party,
				posting_date: values.posting_date,
				mode_of_payment: values.mode_of_payment,
				project: values.project,
				cost_center: values.cost_center,
			},
			callback: (response) => {
				this.update_dt_cards();
			},
		});
	}

	update_transaction(values) {
		frappe.call({
			method:
				"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.update_bank_transaction",
			args: {
				bank_transaction: this.bank_transaction.name,
				transaction_id: values.transaction_id,
				reference_number: values.reference_number,
				party_type: values.party_type,
				party: values.party,
			},
			callback: (response) => {
				this.update_dt_cards();
				// me.dialog.hide();
			},
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
