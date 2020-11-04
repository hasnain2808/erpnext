import frappe

@frappe.whitelist()
def get_bank_transactions(bank_account, from_date, to_date):
	transactions = frappe.get_list(
		'Bank Transaction',
		fields = ['date', 'debit', 'credit', 'currency', 'description', 'name'],
		filters = [
			['bank_account' ,'=', bank_account],
			['date' ,'<=', to_date],
			['date' ,'>=', from_date],
		]
	)
	print(len(transactions))
	return transactions
