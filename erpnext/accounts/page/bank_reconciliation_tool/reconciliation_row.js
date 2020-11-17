
frappe.provide("erpnext.accounts");

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
			options: 'Payment Entry\\nExpense Claim',
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

			{
				fieldtype: "Section Break",
				fieldname: "description_section",
				label: "Description",
				"collapsible": 1,

			},

			{
				fieldname: "description",
				fieldtype: "Small Text",
				read_only: 1
			},
			{
				fieldtype: "Section Break",
				fieldname: "section_break_4",
				label: "Update Bank Transaction Create Vouchers",
				collapsible: 1,

			},
			{
				label: __('Action'),
				fieldname: 'action',
				fieldtype: 'Select',
				options: 'Update Transaction\\nCreate Payment Entry\\nCreate Expense Claim',
				default: 'Update Transaction'
			},
			{
			fieldname: "reference_number",
			fieldtype: "Data",
			label: "Reference Number"
			},
			{
			fieldname: "transaction_id",
			fieldtype: "Data",
			label: "Transaction ID",
			},
			{
			fieldname: "column_break_7",
			fieldtype: "Column Break"
			},
			{
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
			// {
			// 	fieldname: "reference_number",
			// 	fieldtype: "Data",
			// 	label: "Reference Number",
			// },

			{
				fieldname: "update_transaction_button",
				fieldtype: "Button",
				label: "Update Transaction",
				depends_on: "eval:doc.action=='Update Transaction'",
				primary:1,
				click: () => {
					me.make_update_transaction_dialog()
					me.update_transaction_dialog.show()
				}			},

			{
				fieldname: "create_new_payment",
				fieldtype: "Button",
				label: "Create New Payment",
				primary:1,
				depends_on: "eval:doc.action=='Create Payment Entry'",
				click: () => {
					me.make_new_voucher_dialog()
					me.new_voucher_dialog.show()
				}
			},

			{
				fieldname: "create_new_expense",
				fieldtype: "Button",
				label: "Create New Expense Claim",
				depends_on: "eval:doc.action=='Create Expense Claim'",
				primary:1,
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
			proposals_wrapper.show()
			me.dialog.get_field('section_break_1').df.hidden = 0
			me.dialog.get_field('section_break_1').refresh()
			proposals_wrapper.append(
				frappe.render_template("linked_payment_header")
			);
			data.map((value) => {
				proposals_wrapper.append(
					frappe.render_template("linked_payment_row", value)
				);
			});
		} else {
			// const empty_data_msg = __(
			// 	"ERPNext could not find any matching payment entry"
			// );
			// proposals_wrapper.append(
			// 	`<div class="text-center"><h5 class="text-muted">${empty_data_msg}</h5></div>`
			// );
			// proposals_wrapper.hide()
			me.dialog.get_field('section_break_1').df.hidden = 1
			me.dialog.get_field('section_break_1').refresh()
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
		me.dialog.get_field('section_break_3').df.hidden = 1
		me.dialog.get_field('section_break_3').refresh()
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
};