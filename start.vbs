Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Dell\Desktop\AI workplace\NovaWall"
WshShell.Run "cmd.exe /c npm start", 0, false
