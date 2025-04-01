!macro customHeader
  BrandingText "BRS - Blender Render Suite"
!macroend

!macro customInstall
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "BRS" 1
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "BRS" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!macroend

!macro customUnInstall
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "BRS"
!macroend
