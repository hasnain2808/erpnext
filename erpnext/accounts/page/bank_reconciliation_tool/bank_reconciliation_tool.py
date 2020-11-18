import frappe
import csv
import openpyxl
import re
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from six import string_types

from erpnext.accounts.utils import get_balance_on
from frappe.core.doctype.data_import.importer import Importer, ImportFile
from frappe.model.document import Document
from frappe.utils.background_jobs import enqueue

from frappe.utils.xlsxutils import handle_html, ILLEGAL_CHARACTERS_RE

@frappe.whitelist()
def get_bank_transactions(bank_account, from_date = None, to_date = None):
	filters = []
	filters.append(['bank_account' ,'=', bank_account])
	filters.append(['docstatus' ,'=', 1])
	filters.append(['unallocated_amount' ,'>', 0])
	if to_date:
		filters.append(['date' ,'<=', to_date])
	if from_date:
		filters.append(['date' ,'>=', from_date])
	transactions = frappe.get_list(
		'Bank Transaction',
		fields = ['date', 'debit', 'credit', 'currency',
		'description', 'name', 'bank_account', 'company',
		'reference_number', 'transaction_id'],
		filters = filters
	)
	print(len(transactions))
	return transactions

@frappe.whitelist()
def get_account_balance(bank_account, till_date):
	account = frappe.db.get_value('Bank Account', bank_account, 'account')
	print(account)
	balance_as_per_system = get_balance_on(account, till_date)
	print(balance_as_per_system)
	return balance_as_per_system


@frappe.whitelist()
def get_importer_preview(import_file_path, data_import=None, template_options=None):
	dat_data_import = frappe.get_doc(doctype="Data Import")
	dat_data_import.import_type = "Insert New Records"
	dat_data_import.reference_doctype = "Bank Transaction"
	dat_data_import.import_file = import_file_path
	dat_data_import.submit_after_import = 1
	dat_data_import.template_options = template_options
	print(dat_data_import)
	print(dat_data_import.template_options)
	importer = Importer("Bank Transaction", data_import=dat_data_import, file_path = import_file_path)
	preview = importer.get_data_for_import_preview()
	return {"preview":preview, "import_name": importer.data_import.name}


@frappe.whitelist()
def form_start_import(import_file_path, data_import=None, template_options=None, bank_account=None):


	from frappe.core.page.background_jobs.background_jobs import get_info
	from frappe.utils.scheduler import is_scheduler_inactive

	if is_scheduler_inactive() and not frappe.flags.in_test:
		frappe.throw(
			_("Scheduler is inactive. Cannot import data."), title=_("Scheduler Inactive")
		)

	enqueued_jobs = [d.get("job_name") for d in get_info()]
	if "bank_statement_import" not in enqueued_jobs:
		enqueue(
			start_import,
			queue="default",
			timeout=6000,
			event="data_import",
			job_name="bank_statement_import",
			import_file_path=import_file_path,
			data_import=data_import,
			template_options=template_options,
			bank_account=bank_account,
			now=frappe.conf.developer_mode or frappe.flags.in_test,
		)
		return True
	return False
	# return frappe.get_doc("Data Import", data_import).start_import()





def start_import(import_file_path, data_import=None, template_options=None, bank_account=None):
	"""This method runs in background job"""
	# data_import = frappe.get_doc("Data Import", data_import)
	dat_data_import = frappe.get_doc(doctype="Data Import")
	dat_data_import.import_type = "Insert New Records"
	dat_data_import.reference_doctype = "Bank Transaction"
	dat_data_import.import_file = import_file_path
	dat_data_import.submit_after_import = 1
	dat_data_import.template_options = template_options
	try:
		print(template_options)
		import_file = ImportFile("Bank Transaction", file = import_file_path, import_type="Insert New Records")
		data = import_file.raw_data
		data[0].append("Bank Account")
		print(bank_account)
		for row in data[1:]:
			row.append(bank_account)
		print(data)
		full_file_path = import_file.file_doc.get_full_path()
		parts = import_file.file_doc.get_extension()
		extension = parts[1]
		extension = extension.lstrip(".")
		print(extension)
		import csv


		if extension == "csv":
			with open(full_file_path, 'w', newline='') as file:
				writer = csv.writer(file)
				writer.writerows(data)
		elif extension == "xlsx" or "xls":
			write_xlsx(data, "trans", file_path = full_file_path)



		i = Importer("Bank Transaction", data_import=dat_data_import, file_path = import_file_path)

		i.import_data()
	except Exception:
		frappe.db.rollback()
		data_import.db_set("status", "Error")
		frappe.log_error(title=data_import.name)
	finally:
		frappe.flags.in_import = False

	# frappe.publish_realtime("data_import_refresh", {"data_import": data_import.name})

def write_xlsx(data, sheet_name, wb=None, column_widths=None, file_path=None):
	column_widths = column_widths or []
	if wb is None:
		wb = openpyxl.Workbook(write_only=True)

	ws = wb.create_sheet(sheet_name, 0)

	for i, column_width in enumerate(column_widths):
		if column_width:
			ws.column_dimensions[get_column_letter(i + 1)].width = column_width

	row1 = ws.row_dimensions[1]
	row1.font = Font(name='Calibri', bold=True)

	for row in data:
		clean_row = []
		for item in row:
			if isinstance(item, string_types) and (sheet_name not in ['Data Import Template', 'Data Export']):
				value = handle_html(item)
			else:
				value = item

			if isinstance(item, string_types) and next(ILLEGAL_CHARACTERS_RE.finditer(value), None):
				# Remove illegal characters from the string
				value = re.sub(ILLEGAL_CHARACTERS_RE, '', value)

			clean_row.append(value)

		ws.append(clean_row)

	wb.save(file_path)
	return True