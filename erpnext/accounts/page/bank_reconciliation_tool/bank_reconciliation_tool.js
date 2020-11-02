frappe.provide("erpnext.accounts");

frappe.pages['bank-reconciliation-tool'].on_page_load = function(wrapper) {
	new erpnext.accounts.bankReconciliationTool(wrapper);
}


erpnext.accounts.bankReconciliationTool = class BankReconciliationTool {
	constructor(wrapper) {
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Bank Reconciliation Tool"),
			single_column: true
		});
		this.parent = wrapper;
		this.page = this.parent.page;

		// this.check_plaid_status();
		this.make_form();
		this.$result = $('#transactions');
	}

	make_form() {
		this.form = new frappe.ui.FieldGroup({
			fields: [
				{
					fieldname: 'statement_or_manual',
					fieldtype: 'Select',
					options:  'Choose a Statement\nEnter Details Manually',
					default: 'Enter Details Manually'
				},
				{
					fieldtype: 'Column Break',
				},
				{
					fieldtype: 'Link',
					fieldname: 'company',
					label: __('Company'),
					options: 'Company',
				},
				{
					fieldtype: 'Column Break',
				},
				{
					fieldtype: 'Link',
					fieldname: 'bank_account',
					label: __('Bank Account'),
					options: 'Bank Account',
					get_query: () => {
						return {
							filters: {
								"company": ["in", [this.form.get_value("company") || ""]]
							}
						}
					}
				},
				{
					fieldtype: 'Section Break',
					label: __('Choose a Statement'),
					depends_on: "eval:doc.statement_or_manual=='Choose a Statement'"
				},
				{
					fieldname: 'bank_statement',
					fieldtype: 'Link',
					options: 'Bank Statement',
					get_query: () => {
						return {
							filters: {
								"bank_account": ["in", [this.form.get_value("bank_account") || ""]]
							}
						}
					}
				},
				{
					fieldtype: 'Section Break',
					label: __('Enter Details Manually'),
					depends_on: "eval:doc.statement_or_manual=='Enter Details Manually'"
				},
				{
					fieldname: 'opening_balance',
					label: __('Opening Balance'),
					fieldtype: 'Currency',
					options: 'Currency'
				},
				{
					fieldname: 'closing_balance',
					label: __('Closing Balance'),
					fieldtype: 'Currency',
					options: 'Currency'
				},
				{
					fieldtype: 'Column Break',
				},
				{
					fieldname: 'from_date',
					label: __('From Date'),
					fieldtype: 'Date',
				},
				{
					fieldname: 'to_date',
					label: __('To Date'),
					fieldtype: 'Date',
					change: () => this.make_reconciliation_tool(),

				},
				{
					fieldtype: 'Column Break',
				},
				{
					fieldtype: 'Section Break',
					label: __('Reconcile'),
				},
				{
					fieldname: 'transactions',
					fieldtype: 'HTML',
					options: `<div id = "transactions"></div>`
				},


			],
			body: this.page.body
		});

		this.form.make();
	}

	make_reconciliation_tool() {
		const me  = this;
		me.render_header()
		// frappe.model.with_doctype("Bank Transaction", () => {
		// 	erpnext.accounts.ReconciliationList = new erpnext.accounts.ReconciliationTool({
		// 		parent: this.parent,
		// 		doctype: "Bank Transaction"
		// 	});
		// })
		me.render()
	}

	render() {
		const me = this;
		this.$result.find('.list-row-container').remove();
		$('[data-fieldname="name"]').remove();
		frappe.call({
			method:"erpnext.accounts.doctype.bank_transaction.bank_transaction.get_bank_transactions",
			// args:{

			// },
			callback: function(r) {
				console.log(r)
				me.data = r.message
				console.log(transactions)
				me.data.map((value) => {
					const row = $('<div class="list-row-container">').data("data", value).appendTo(me.$result).get(0);
					new erpnext.accounts.ReconciliationRow(row, value);
				})
			}
		});


	}

	render_header() {
		const me = this;
		if ($(this.wrapper).find('.transaction-header').length === 0) {
			me.$result.append(frappe.render_template("bank_transaction_header", {}));
		}
	}

}


erpnext.accounts.ReconciliationRow = class ReconciliationRow {
	constructor(row, data) {
		this.data = data;
		this.row = row;
		this.make();
		this.bind_events();
	}

	make() {
		$(this.row).append(frappe.render_template("bank_transaction_row", this.data))
	}

	bind_events() {
		const me = this;
		$(me.row).on('click', '.clickable-section', function() {
			me.bank_entry = $(this).attr("data-name");
			me.show_dialog($(this).attr("data-name"));
		})

		$(me.row).on('click', '.new-reconciliation', function() {
			me.bank_entry = $(this).attr("data-name");
			me.show_dialog($(this).attr("data-name"));
		})

		$(me.row).on('click', '.new-payment', function() {
			me.bank_entry = $(this).attr("data-name");
			me.new_payment();
		})

		$(me.row).on('click', '.new-invoice', function() {
			me.bank_entry = $(this).attr("data-name");
			me.new_invoice();
		})

		$(me.row).on('click', '.new-expense', function() {
			me.bank_entry = $(this).attr("data-name");
			me.new_expense();
		})
	}

	new_payment() {
		const me = this;
		const paid_amount = me.data.credit > 0 ? me.data.credit : me.data.debit;
		const payment_type = me.data.credit > 0 ? "Receive": "Pay";
		const party_type = me.data.credit > 0 ? "Customer": "Supplier";

		frappe.new_doc("Payment Entry", {"payment_type": payment_type, "paid_amount": paid_amount,
			"party_type": party_type, "paid_from": me.data.bank_account})
	}

	new_invoice() {
		const me = this;
		const invoice_type = me.data.credit > 0 ? "Sales Invoice" : "Purchase Invoice";

		frappe.new_doc(invoice_type)
	}

	new_expense() {
		frappe.new_doc("Expense Claim")
	}


	show_dialog(data) {
		const me = this;

		frappe.db.get_value("Bank Account", me.data.bank_account, "account", (r) => {
			me.gl_account = r.account;
		})

		frappe.xcall('erpnext.accounts.page.bank_reconciliation.bank_reconciliation.get_linked_payments',
			{ bank_transaction: data, freeze: true, freeze_message: __("Finding linked payments") }
		).then((result) => {
			me.make_dialog(result)
		})
	}

	make_dialog(data) {
		const me = this;
		me.selected_payment = null;

		const fields = [
			{
				fieldtype: 'Section Break',
				fieldname: 'section_break_1',
				label: __('Automatic Reconciliation')
			},
			{
				fieldtype: 'HTML',
				fieldname: 'payment_proposals'
			},
			{
				fieldtype: 'Section Break',
				fieldname: 'section_break_2',
				label: __('Search for a payment')
			},
			{
				fieldtype: 'Link',
				fieldname: 'payment_doctype',
				options: 'DocType',
				label: 'Payment DocType',
				get_query: () => {
					return {
						filters : {
							"name": ["in", ["Payment Entry", "Journal Entry", "Sales Invoice", "Purchase Invoice", "Expense Claim"]]
						}
					}
				},
			},
			{
				fieldtype: 'Column Break',
				fieldname: 'column_break_1',
			},
			{
				fieldtype: 'Dynamic Link',
				fieldname: 'payment_entry',
				options: 'payment_doctype',
				label: 'Payment Document',
				get_query: () => {
					let dt = this.dialog.fields_dict.payment_doctype.value;
					if (dt === "Payment Entry") {
						return {
							query: "erpnext.accounts.page.bank_reconciliation.bank_reconciliation.payment_entry_query",
							filters : {
								"bank_account": this.data.bank_account,
								"company": this.data.company
							}
						}
					} else if (dt === "Journal Entry") {
						return {
							query: "erpnext.accounts.page.bank_reconciliation.bank_reconciliation.journal_entry_query",
							filters : {
								"bank_account": this.data.bank_account,
								"company": this.data.company
							}
						}
					} else if (dt === "Sales Invoice") {
						return {
							query: "erpnext.accounts.page.bank_reconciliation.bank_reconciliation.sales_invoices_query"
						}
					} else if (dt === "Purchase Invoice") {
						return {
							filters : [
								["Purchase Invoice", "ifnull(clearance_date, '')", "=", ""],
								["Purchase Invoice", "docstatus", "=", 1],
								["Purchase Invoice", "company", "=", this.data.company]
							]
						}
					} else if (dt === "Expense Claim") {
						return {
							filters : [
								["Expense Claim", "ifnull(clearance_date, '')", "=", ""],
								["Expense Claim", "docstatus", "=", 1],
								["Expense Claim", "company", "=", this.data.company]
							]
						}
					}
				},
				onchange: function() {
					if (me.selected_payment !== this.value) {
						me.selected_payment = this.value;
						me.display_payment_details(this);
					}
				}
			},
			{
				fieldtype: 'Section Break',
				fieldname: 'section_break_3'
			},
			{
				fieldtype: 'HTML',
				fieldname: 'payment_details'
			},
		];

		me.dialog = new frappe.ui.Dialog({
			title: __("Choose a corresponding payment"),
			fields: fields,
			size: "large"
		});

		const proposals_wrapper = me.dialog.fields_dict.payment_proposals.$wrapper;
		if (data && data.length > 0) {
			proposals_wrapper.append(frappe.render_template("linked_payment_header"));
			data.map(value => {
				proposals_wrapper.append(frappe.render_template("linked_payment_row", value))
			})
		} else {
			const empty_data_msg = __("ERPNext could not find any matching payment entry")
			proposals_wrapper.append(`<div class="text-center"><h5 class="text-muted">${empty_data_msg}</h5></div>`)
		}

		$(me.dialog.body).on('click', '.reconciliation-btn', (e) => {
			const payment_entry = $(e.target).attr('data-name');
			const payment_doctype = $(e.target).attr('data-doctype');
			frappe.xcall('erpnext.accounts.page.bank_reconciliation.bank_reconciliation.reconcile',
				{bank_transaction: me.bank_entry, payment_doctype: payment_doctype, payment_name: payment_entry})
			.then((result) => {
				setTimeout(function(){
					erpnext.accounts.ReconciliationList.refresh();
				}, 2000);
				me.dialog.hide();
			})
		})

		me.dialog.show();
	}

	display_payment_details(event) {
		const me = this;
		if (event.value) {
			let dt = me.dialog.fields_dict.payment_doctype.value;
			me.dialog.fields_dict['payment_details'].$wrapper.empty();
			frappe.db.get_doc(dt, event.value)
			.then(doc => {
				let displayed_docs = []
				let payment = []
				if (dt === "Payment Entry") {
					payment.currency = doc.payment_type == "Receive" ? doc.paid_to_account_currency : doc.paid_from_account_currency;
					payment.doctype = dt
					payment.posting_date = doc.posting_date;
					payment.party = doc.party;
					payment.reference_no = doc.reference_no;
					payment.reference_date = doc.reference_date;
					payment.paid_amount = doc.paid_amount;
					payment.name = doc.name;
					displayed_docs.push(payment);
				} else if (dt === "Journal Entry") {
					doc.accounts.forEach(payment => {
						if (payment.account === me.gl_account) {
							payment.doctype = dt;
							payment.posting_date = doc.posting_date;
							payment.party = doc.pay_to_recd_from;
							payment.reference_no = doc.cheque_no;
							payment.reference_date = doc.cheque_date;
							payment.currency = payment.account_currency;
							payment.paid_amount = payment.credit > 0 ? payment.credit : payment.debit;
							payment.name = doc.name;
							displayed_docs.push(payment);
						}
					})
				} else if (dt === "Sales Invoice") {
					doc.payments.forEach(payment => {
						if (payment.clearance_date === null || payment.clearance_date === "") {
							payment.doctype = dt;
							payment.posting_date = doc.posting_date;
							payment.party = doc.customer;
							payment.reference_no = doc.remarks;
							payment.currency = doc.currency;
							payment.paid_amount = payment.amount;
							payment.name = doc.name;
							displayed_docs.push(payment);
						}
					})
				}

				const details_wrapper = me.dialog.fields_dict.payment_details.$wrapper;
				details_wrapper.append(frappe.render_template("linked_payment_header"));
				displayed_docs.forEach(payment => {
					details_wrapper.append(frappe.render_template("linked_payment_row", payment));
				})
			})
		}

	}
}
