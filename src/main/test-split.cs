using System;
using System.Runtime.InteropServices;
using System.Text;

class TestSplit {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string c, string w);
    [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string w);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, IntPtr wp, IntPtr lp, uint f, uint t, out IntPtr r);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder b, int c);

    static void Dump() {
        EnumWindows((hwnd, lParam) => {
            StringBuilder sb = new StringBuilder(256);
            GetClassName(hwnd, sb, 256);
            string cls = sb.ToString();
            if (cls == "Progman" || cls == "WorkerW") {
                IntPtr sv = FindWindowEx(hwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
                if (sv != IntPtr.Zero) Console.WriteLine(string.Format("{0} ({1}) -> Has SHELLDLL_DefView", cls, hwnd));
                else Console.WriteLine(string.Format("{0} ({1}) -> Empty", cls, hwnd));
            }
            return true;
        }, IntPtr.Zero);
    }

    static void Main() {
        Console.WriteLine("BEFORE:"); Dump();
        IntPtr p = FindWindow("Progman", null);
        IntPtr r;
        Console.WriteLine("Sending 0x052C...");
        SendMessageTimeout(p, 0x052C, IntPtr.Zero, IntPtr.Zero, 0x0000, 1000, out r);
        System.Threading.Thread.Sleep(500); // Give it a moment to spawn
        Console.WriteLine("AFTER:"); Dump();
    }
}
