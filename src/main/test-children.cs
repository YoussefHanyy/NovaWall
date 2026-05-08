using System;
using System.Runtime.InteropServices;
using System.Text;

class TestChildren {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hwndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string c, string w);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder b, int c);

    static void Main() {
        IntPtr p = FindWindow("Progman", null);
        Console.WriteLine(string.Format("Progman: {0}", p));
        EnumChildWindows(p, (hwnd, lParam) => {
            StringBuilder sb = new StringBuilder(256);
            GetClassName(hwnd, sb, 256);
            Console.WriteLine(string.Format("  Child: {0} ({1})", sb.ToString(), hwnd));
            return true;
        }, IntPtr.Zero);
    }
}
