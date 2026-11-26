from pathlib import Path
from pywinauto import Desktop
import subprocess
import os
import time
import traceback


BASE_DIR = Path(__file__).resolve().parent

PDF_PATH = BASE_DIR / "uploads" / "test.pdf"

PAC_EXE = Path(os.environ["LOCALAPPDATA"]) / "PAC" / "PAC.exe"

PAC_TITLE = "PAC 2026 - PDF Accessibility Checker"


def get_pac_window():

    desktop = Desktop(backend="uia")

    pac = desktop.window(
        title=PAC_TITLE,
        auto_id="MainForm"
    )

    # Check if PAC is already running
    if pac.exists(timeout=3):

        print("PAC is already running.")

    else:

        print("PAC is not running.")
        print("Launching PAC automatically...")

        if not PAC_EXE.is_file():

            raise FileNotFoundError(
                f"PAC executable not found: {PAC_EXE}"
            )

        subprocess.Popen(
            [str(PAC_EXE)],
            cwd=str(PAC_EXE.parent)
        )

        print("PAC launch command executed.")
        print("Waiting for PAC window...")

    pac.wait(
        "exists visible",
        timeout=60
    )

    print("PAC window detected successfully.")

    return pac


def get_file_dialog(pac):

    return pac.child_window(
        title_re=r"^Select PDF file.*",
        control_type="Window"
    )


def open_pdf(pdf_path):

    pdf_path = Path(pdf_path).resolve()

    if not pdf_path.is_file():

        raise FileNotFoundError(
            f"PDF not found: {pdf_path}"
        )

    print("=" * 60)
    print("PAC AUTOMATION STARTED")
    print("=" * 60)

    print("Connecting to PAC...")

    pac = get_pac_window()

    print("PAC connected successfully.")
    print("PDF path:", pdf_path)

    file_dialog = get_file_dialog(pac)

    # Check whether the file dialog is already open
    if file_dialog.exists(timeout=2):

        print("File selection dialog already open.")

    else:

        pac.wait("enabled", timeout=20)
        pac.set_focus()

        open_button = pac.child_window(
            auto_id="openButton",
            control_type="Button"
        )

        open_button.wait(
            "visible enabled",
            timeout=20
        )

        open_button.click_input()

        print("Open document button clicked.")

    # Wait for file selection dialog
    file_dialog.wait(
        "exists visible enabled",
        timeout=30
    )

    print("File selection dialog detected.")

    file_dialog.set_focus()

    # Locate filename input
    filename_input = file_dialog.child_window(
        title="File name:",
        auto_id="1148",
        control_type="Edit"
    )

    filename_input.wait(
        "visible enabled",
        timeout=15
    )

    print("Filename input detected.")

    # Enter PDF path
    filename_input.set_edit_text(str(pdf_path))

    print("PDF path entered successfully.")

    # Locate Open button
    open_dialog_button = file_dialog.child_window(
        title="Open",
        auto_id="1",
        control_type="Button"
    )

    open_dialog_button.wait(
        "visible enabled",
        timeout=15
    )

    open_dialog_button.click_input()

    print("Open button clicked.")
    print("PDF submitted to PAC.")

    # Wait for dialog to close
    file_dialog.wait_not(
        "visible",
        timeout=30
    )

    print("File selection dialog closed.")
    print("Waiting for PDF to load...")

    filename_control = pac.child_window(
        auto_id="filenameLabelValue",
        control_type="Edit"
    )

    deadline = time.monotonic() + 120
    last_error = None

    while time.monotonic() < deadline:

        try:

            loaded_filename = filename_control.get_value()

            if (
                Path(str(loaded_filename)).name.lower()
                == pdf_path.name.lower()
            ):

                print("\n" + "=" * 60)
                print("PDF LOADED SUCCESSFULLY")
                print("=" * 60)

                print("Filename:", loaded_filename)

                return pac

        except Exception as e:

            last_error = str(e)

        time.sleep(1)

    raise TimeoutError(
        f"Could not confirm PDF loading. "
        f"Last error: {last_error}"
    )


if __name__ == "__main__":

    try:

        open_pdf(PDF_PATH)

    except Exception as e:

        print("\n" + "=" * 60)
        print("PAC AUTOMATION FAILED")
        print("=" * 60)

        print("Error type:", type(e).__name__)
        print("Error message:", str(e))

        traceback.print_exc()

        raise SystemExit(1)