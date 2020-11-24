
frappe.provide("erpnext.accounts");

erpnext.accounts.BankReconciliationNumberCardManager = class BankReconciliationNumberCardManager {
	constructor(
		$reconciliation_tool_cards,
		bank_statement_closing_balance,
		cleared_balance,
		currency
	) {
		// this.data = data
		this.$reconciliation_tool_cards = $reconciliation_tool_cards;
		this.bank_statement_closing_balance = bank_statement_closing_balance;
		this.cleared_balance = cleared_balance;
		this.currency = currency;
		this.make_cards();
	}

	make_cards() {
		this.$cards = [];
		const me = this;
		this.$summary = $(`<div class="report-summary"></div>`)
			.hide()
			.appendTo(this.$reconciliation_tool_cards);
		var chart_data = [
			{
				value: me.bank_statement_closing_balance,
				label: "Statement Ending Balance",
				datatype: "Currency",
				currency: me.currency,
			},
			{
				value: me.cleared_balance,
				label: "Cleared Balance",
				datatype: "Currency",
				currency: me.currency,
			},
			{
				indicator:
					me.bank_statement_closing_balance - me.cleared_balance == 0
						? "Green"
						: "Red",
				value: me.bank_statement_closing_balance - me.cleared_balance,
				label: "Difference",
				datatype: "Currency",
				currency: me.currency,
			},
		];

		chart_data.forEach((summary) => {
			// frappe.widget.utils
			// 	.build_summary_item(summary)

			let number_card = new erpnext.accounts.NumberCard(summary);
			this.$cards.push(number_card);

			number_card.$card.appendTo(this.$summary);
		});
		console.log(this.$cards);
		// this.$cards[0].set_value(40)
		// this.$cards[2].set_indicator('green')
		this.$summary.css("border-bottom", "0px");
		this.$summary.show();
	}
};

erpnext.accounts.NumberCard = class NumberCard {
	constructor(options) {
		this.$card = frappe.widget.utils.build_summary_item(options);
	}

	set_value(value) {
		this.$card.find("div").text(value);
	}

	set_indicator(color) {
		this.$card
			.find("span")
			.removeClass("indicator red green")
			.addClass(`indicator ${color}`);
	}
};