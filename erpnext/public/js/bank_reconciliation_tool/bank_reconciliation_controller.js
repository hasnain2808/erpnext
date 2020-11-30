frappe.provide("erpnext.accounts");

erpnext.accounts.BankReconciliationController = class BankReconciliationController {
	constructor(wrapper) {
		console.log(wrapper);
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Bank Reconciliation Tool"),
			single_column: true,
		});
		this.upload_statement_button = this.page.set_secondary_action(
			__("Upload a Statement"),
			() =>
				this.upload_statement_dialog_object.upload_statement_dialog.show()
		);

		this.parent = wrapper;
		this.page = this.parent.page;
		this.upload_statement_dialog_object = new erpnext.accounts.UploadStatememt();
		this.make_form();
		this.$reconciliation_tool_cards = this.form.get_field(
			"reconciliation_tool_cards"
		).$wrapper; //.find('.reconciliation_tool_cards')
		this.$reconciliation_tool_dt = this.form.get_field(
			"reconciliation_tool_dt"
		).$wrapper; //.find('.reconciliation_tool_dt')
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
						console.log(me.form.get_value("company"));
						me.company = me.form.get_value("company") || "";
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
						frappe.db.get_value(
							"Bank Account",
							me.bank_account,
							"account",
							(r) => {
								frappe.db.get_value(
									"Account",
									r.account,
									"account_currency",
									(r) => {
										me.currency = r.account_currency;
									}
								);
							}
						);
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
					fieldname: "reconciliation_tool_cards",
					fieldtype: "HTML",
					// options: `<div class = "reconciliation_tool_cards"></div>`,
				},
				{
					fieldname: "reconciliation_tool_dt",
					fieldtype: "HTML",
					// options: `<div class = "reconciliation_tool_dt"></div>`,
				},
			],
			body: me.page.body,
		});
		me.form.make();
	}

	make_reconciliation_tool() {
		const me = this;
		me.$reconciliation_tool_cards.empty();
		if (this.bank_account && this.bank_statement_to_date) {
			me.get_cleared_balance().then(() => {
				if (
					this.bank_account &&
					this.bank_statement_from_date &&
					this.bank_statement_to_date &&
					this.bank_statement_closing_balance
				) {
					me.render_chart();
					me.render();
					frappe.utils.scroll_to(
						me.$reconciliation_tool_cards,
						true,
						30
					);
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

	render_chart() {
		const me = this;
		me.cards_manager = new erpnext.accounts.BankReconciliationNumberCardManager(
			me.$reconciliation_tool_cards,
			me.bank_statement_closing_balance,
			me.cleared_balance,
			me.currency
		);
	}

	render() {
		const me = this;
		if (me.bank_account) {
			console.log(me.company);
			this.bank_reconciliation_data_table_manager = new erpnext.accounts.BankReconciliationDataTableManager(
				me.company,
				me.bank_account,
				me.$reconciliation_tool_dt,
				me.bank_statement_from_date,
				me.bank_statement_to_date,
				me.bank_statement_closing_balance,
				me.cards_manager
			);
		}
	}
};
