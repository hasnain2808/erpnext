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
		const this = this;
		this.datatable_options = {
			columns: this.columns,
			data: this.transactions,
			dynamicRowHeight: true,
			checkboxColumn: false,
			inlineFilters: true,
		};
	}

	get_datatable() {
		if (!this.datatable) {
			this.datatable = new frappe.DataTable(
				this.$reconciliation_tool_dt.get(0),
				this.datatable_options
			);
		} else {
			this.datatable.refresh(this.transactions, this.columns);
		}
	}

	set_datatable_style() {
		$(`.${this.datatable.style.scopeClass} .dt-scrollable`).css(
			"max-height",
			"calc(100vh - 400px)"
		);
	}

	set_listeners() {
		console.log("listener set");
		var me = this;
		$(`.${this.datatable.style.scopeClass} .dt-scrollable`).on(
			"click",
			`.close`,
			function () {
				me.dialog_manager.show_dialog($(this).attr("data-name"), () =>
					me.update_dt_cards()
				);
				return true;
			}
		);
	}

	update_dt_cards(result) {
		const me = this;
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
