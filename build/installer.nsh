; Se incluye en el instalador NSIS de electron-builder (ver "nsis.include"
; en package.json).
;
; Al actualizar desde la app (instalación silenciosa), electron-builder
; solo vuelve a abrir la app al final y a través del Explorador de Windows,
; y en la práctica a veces no abría nada: la secretaria veía que la app se
; cerraba y ya no regresaba. Aquí se abre directo en cuanto los archivos
; nuevos ya están copiados. Si el paso de electron-builder también la abre,
; el bloqueo de una sola instancia (electron/main.js) junta las dos en una.
!macro customInstall
  ${if} ${isUpdated}
    Exec '"$appExe" --updated'
  ${endIf}
!macroend
