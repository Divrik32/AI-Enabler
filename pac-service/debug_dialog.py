
from pywinauto import Desktop
import time
import traceback


def detect_dialog():

    desktop = Desktop(backend="uia")

    print("\nSearching for PAC windows and dialogs...")
    print("=" * 70)

    for window in desktop.windows():

        try:
            title = window.window_text()
            class_name = window.class_name()
            process_id = window.process_id()
            handle = window.handle

            print("\nTitle:", title)
            print("Class:", class_name)
            print("Process ID:", process_id)
            print("Handle:", handle)
            print("Enabled:", window.is_enabled())
            print("Visible:", window.is_visible())
            print("Control type:", window.element_info.control_type)

            if (
                "pac 2026" in title.lower()
                or "open" in title.lower()
                or "select" in title.lower()
                or class_name == "#32770"
            ) and "Chrome_WidgetWin" not in class_name:

                print("\nControl identifiers:")
                print("-" * 70)

                window_spec = desktop.window(
                    handle=handle
                )

                window_spec.print_control_identifiers(
                    depth=8
                )

            print("=" * 70)

        except Exception as e:
            print("Error:", str(e))

    print("\nDetection completed.")


if __name__ == "__main__":

    try:
        print("Starting detection in 10 seconds...")
        time.sleep(10)

        detect_dialog()

    except Exception:
        traceback.print_exc()
