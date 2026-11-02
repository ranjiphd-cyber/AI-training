"""Regenerate the blank Excel intake template: python make_template.py"""

from engine.excel_io import build_workbook
from engine.parser import empty_profile
from engine.questions import generic_questions

if __name__ == "__main__":
    path = "templates/Candidate_Intake_Template.xlsx"
    with open(path, "wb") as fh:
        fh.write(build_workbook(empty_profile(), {}, {}, generic_questions()))
    print("Wrote", path)
