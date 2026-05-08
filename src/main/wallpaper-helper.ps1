param(
    [Parameter(Mandatory=$true)]
    [string]$Action,
    [string]$Hwnd = "0"
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WallpaperHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string c, string w);

    [DllImport("user32.dll")]
    public static extern IntPtr FindWindowEx(IntPtr p, IntPtr after, string c, string w);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, IntPtr wp, IntPtr lp, uint f, uint t, out IntPtr r);

    [DllImport("user32.dll")]
    public static extern IntPtr SetParent(IntPtr child, IntPtr parent);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr h, int cmd);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetDesktopWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr h, out RECT r);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int i);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int L, T, R, B; }

    public static bool Embed(long childHwnd) {
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) return false;

        // Spawn WorkerW
        IntPtr unused;
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out unused);

        IntPtr child = new IntPtr(childHwnd);

        // Check if SHELLDLL_DefView is directly under Progman
        IntPtr defView = FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
        if (defView != IntPtr.Zero) {
            // Parent to Progman, send behind the icon layer
            SetParent(child, progman);
            ShowWindow(child, 5);
            SetWindowPos(child, new IntPtr(1), 0, 0, 0, 0, 0x0013);
            return true;
        }

        // Find WorkerW windows using iteration (no EnumWindows callback needed)
        IntPtr ww = FindWindowEx(IntPtr.Zero, IntPtr.Zero, "WorkerW", null);
        while (ww != IntPtr.Zero) {
            IntPtr sv = FindWindowEx(ww, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (sv != IntPtr.Zero) {
                // Found the WorkerW with icons, get the NEXT WorkerW
                IntPtr target = FindWindowEx(IntPtr.Zero, ww, "WorkerW", null);
                if (target != IntPtr.Zero) {
                    SetParent(child, target);
                    ShowWindow(child, 5);
                    return true;
                }
            }
            ww = FindWindowEx(IntPtr.Zero, ww, "WorkerW", null);
        }

        // Fallback: just parent to Progman behind everything
        SetParent(child, progman);
        ShowWindow(child, 5);
        SetWindowPos(child, new IntPtr(1), 0, 0, 0, 0, 0x0013);
        return true;
    }

    public static bool IsFullscreen() {
        IntPtr fg = GetForegroundWindow();
        if (fg == IntPtr.Zero || fg == GetDesktopWindow() || fg == GetShellWindow()) return false;
        RECT r;
        GetWindowRect(fg, out r);
        return (r.R - r.L) >= GetSystemMetrics(0) && (r.B - r.T) >= GetSystemMetrics(1);
    }
}
"@

switch ($Action) {
    "embed"      { Write-Output ([WallpaperHelper]::Embed([long]$Hwnd)) }
    "fullscreen" { Write-Output ([WallpaperHelper]::IsFullscreen()) }
}
