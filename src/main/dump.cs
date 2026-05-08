using System;
using System.Runtime.InteropServices;
using System.Text;

class DumpWindows {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string w);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder b, int c);

    static void Main() {
        EnumWindows((hwnd, lParam) => {
            StringBuilder sb = new StringBuilder(256);
            GetClassName(hwnd, sb, 256);
            string cls = sb.ToString();
            
            if (cls == "Progman" || cls == "WorkerW") {
                Console.WriteLine(string.Format("Found: {0} ({1})", cls, hwnd));
                IntPtr sv = FindWindowEx(hwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
                if (sv != IntPtr.Zero) {
                    Console.WriteLine(string.Format("  -> Has SHELLDLL_DefView ({0})", sv));
                }
            }
            return true;
        }, IntPtr.Zero);
    }
}
