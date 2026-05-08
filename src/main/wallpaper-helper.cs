using System;
using System.Runtime.InteropServices;

class WallpaperHelper {
    [DllImport("user32.dll")]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);
    
    [DllImport("user32.dll")]
    static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
    
    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    static extern IntPtr GetDesktopWindow();
    
    [DllImport("user32.dll")]
    static extern IntPtr GetShellWindow();
    
    [DllImport("user32.dll")]
    static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    static extern int GetSystemMetrics(int nIndex);

    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int L, T, R, B; }

    static bool Embed(long childHwnd) {
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) return false;
        
        IntPtr child = new IntPtr(childHwnd);

        // Windows 11 22H2+ modern desktop architecture:
        // WorkerW is a child of Progman, sitting behind SHELLDLL_DefView.
        IntPtr childWorkerW = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
        if (childWorkerW != IntPtr.Zero) {
            SetParent(child, childWorkerW);
            ShowWindow(child, 5);
            return true;
        }

        // Older Windows 10/11 architecture:
        // Send 0x052C to make Progman split the desktop into multiple top-level windows
        IntPtr result;
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out result);

        IntPtr targetWorkerW = IntPtr.Zero;

        EnumWindows(new EnumWindowsProc((hwnd, lParam) => {
            IntPtr shellView = FindWindowEx(hwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (shellView != IntPtr.Zero) {
                // Gets the WorkerW Window immediately after the one hosting SHELLDLL_DefView
                targetWorkerW = FindWindowEx(IntPtr.Zero, hwnd, "WorkerW", null);
            }
            return true;
        }), IntPtr.Zero);

        if (targetWorkerW != IntPtr.Zero) {
            SetParent(child, targetWorkerW);
            ShowWindow(child, 5);
            return true;
        }

        return false;
    }

    static bool IsFullscreen() {
        IntPtr fg = GetForegroundWindow();
        if (fg == IntPtr.Zero || fg == GetDesktopWindow() || fg == GetShellWindow()) return false;
        RECT r; GetWindowRect(fg, out r);
        return (r.R - r.L) >= GetSystemMetrics(0) && (r.B - r.T) >= GetSystemMetrics(1);
    }

    static void Main(string[] args) {
        if (args.Length == 0) { Console.WriteLine("Usage: helper.exe embed <hwnd> | fullscreen"); return; }
        switch (args[0]) {
            case "embed":
                if (args.Length < 2) { Console.WriteLine("False"); return; }
                Console.WriteLine(Embed(long.Parse(args[1])));
                break;
            case "fullscreen":
                Console.WriteLine(IsFullscreen());
                break;
        }
    }
}
