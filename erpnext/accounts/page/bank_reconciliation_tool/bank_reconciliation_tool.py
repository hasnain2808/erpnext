import frappe
from erpnext.accounts.utils import get_balance_on

@frappe.whitelist()
def get_bank_transactions(bank_account, from_date = None, to_date = None):
	filters = []
	filters.append(['bank_account' ,'=', bank_account])
	if to_date:
		filters.append(['date' ,'<=', to_date])
	if from_date:
		filters.append(['date' ,'>=', from_date])
	transactions = frappe.get_list(
		'Bank Transaction',
		fields = ['date', 'debit', 'credit', 'currency', 'description', 'name'],
		filters = filters
	)
	print(len(transactions))
	return transactions

# @frappe.whitelist()
# def get_account_balance(bank_account, date):
#     account = frappe.db.get_value('Bank Account', bank_account, 'account')
# 	balance_as_per_system = get_balance_on(account, date)
# 	return balance_as_per_system