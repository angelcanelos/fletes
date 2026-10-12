# Splash de la etapa de instalación (continuación de electron/splash.html).
#
# El instalador tiene que cerrar la app para reemplazar sus archivos, y con
# ella se cerraría el splash de Electron. Esta ventana corre en un proceso
# aparte (PowerShell + WPF, que trae Windows) con el mismo diseño, así que
# el progreso sigue viéndose en el mismo splash hasta que la app vuelve a
# abrir. electron/main.js la copia a la carpeta temporal y la lanza.
param(
  [int]$InstaladorPid,
  [int]$AppPid,
  [string]$AppExe,
  [string]$Logo,
  [string]$Icono,
  [string]$Listo
)

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Actualizando" Width="320" Height="380"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        ResizeMode="NoResize" WindowStartupLocation="CenterScreen" Topmost="True">
  <Border CornerRadius="10">
    <Border.Background>
      <RadialGradientBrush Center="0.5,0.3" GradientOrigin="0.5,0.3" RadiusX="0.85" RadiusY="0.75">
        <GradientStop Color="#2D2650" Offset="0"/>
        <GradientStop Color="#1E1B2E" Offset="0.65"/>
      </RadialGradientBrush>
    </Border.Background>
    <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
      <Grid Width="112" Height="112" HorizontalAlignment="Center">
        <Ellipse x:Name="Halo" RenderTransformOrigin="0.5,0.5">
          <Ellipse.Fill>
            <RadialGradientBrush>
              <GradientStop Color="#737C6CFF" Offset="0"/>
              <GradientStop Color="#007C6CFF" Offset="0.7"/>
            </RadialGradientBrush>
          </Ellipse.Fill>
          <Ellipse.RenderTransform><ScaleTransform x:Name="HaloEscala" ScaleX="0.85" ScaleY="0.85"/></Ellipse.RenderTransform>
        </Ellipse>
        <Image x:Name="LogoImg" Width="88" Height="88" RenderOptions.BitmapScalingMode="HighQuality">
          <Image.RenderTransform><TranslateTransform x:Name="Flotar" Y="0"/></Image.RenderTransform>
        </Image>
      </Grid>
      <TextBlock x:Name="Titulo" Margin="28,28,28,0" HorizontalAlignment="Center" TextAlignment="Center" TextWrapping="Wrap"
                 Foreground="#ECE9FF" FontFamily="Segoe UI" FontSize="15" FontWeight="SemiBold" Text="Instalando actualización…"/>
      <TextBlock x:Name="Sub" Margin="28,6,28,0" HorizontalAlignment="Center" TextAlignment="Center" TextWrapping="Wrap"
                 Foreground="#A8A2CC" FontFamily="Segoe UI" FontSize="12.5" Text="Preparando la instalación…" MinHeight="34"/>
      <Border Width="200" Height="6" CornerRadius="3" Background="#1AFFFFFF" Margin="0,22,0,0" ClipToBounds="True">
        <Canvas ClipToBounds="True">
          <Border x:Name="Relleno" Width="70" Height="6" CornerRadius="3">
            <Border.Background>
              <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
                <GradientStop Color="#7C6CFF" Offset="0"/>
                <GradientStop Color="#A78BFA" Offset="1"/>
              </LinearGradientBrush>
            </Border.Background>
            <Border.RenderTransform><TranslateTransform x:Name="IrVenir" X="-70"/></Border.RenderTransform>
          </Border>
        </Canvas>
      </Border>
    </StackPanel>
  </Border>
  <Window.Triggers>
    <EventTrigger RoutedEvent="Window.Loaded">
      <BeginStoryboard>
        <Storyboard>
          <DoubleAnimation Storyboard.TargetName="Flotar" Storyboard.TargetProperty="Y" From="0" To="-6" Duration="0:0:1.1" AutoReverse="True" RepeatBehavior="Forever">
            <DoubleAnimation.EasingFunction><SineEase EasingMode="EaseInOut"/></DoubleAnimation.EasingFunction>
          </DoubleAnimation>
          <DoubleAnimation Storyboard.TargetName="HaloEscala" Storyboard.TargetProperty="ScaleX" From="0.85" To="1.1" Duration="0:0:1.1" AutoReverse="True" RepeatBehavior="Forever"/>
          <DoubleAnimation Storyboard.TargetName="HaloEscala" Storyboard.TargetProperty="ScaleY" From="0.85" To="1.1" Duration="0:0:1.1" AutoReverse="True" RepeatBehavior="Forever"/>
          <DoubleAnimation Storyboard.TargetName="IrVenir" Storyboard.TargetProperty="X" From="-70" To="200" Duration="0:0:1.2" RepeatBehavior="Forever">
            <DoubleAnimation.EasingFunction><SineEase EasingMode="EaseInOut"/></DoubleAnimation.EasingFunction>
          </DoubleAnimation>
        </Storyboard>
      </BeginStoryboard>
    </EventTrigger>
  </Window.Triggers>
</Window>
'@

$ventana = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
$titulo = $ventana.FindName('Titulo')
$sub = $ventana.FindName('Sub')

function Cargar-Imagen([string]$ruta) {
  if (-not $ruta -or -not (Test-Path $ruta)) { return $null }
  $img = New-Object System.Windows.Media.Imaging.BitmapImage
  $img.BeginInit(); $img.CacheOption = 'OnLoad'; $img.UriSource = New-Object Uri $ruta; $img.EndInit()
  return $img
}
$ventana.FindName('LogoImg').Source = Cargar-Imagen $Logo
try { $ventana.Icon = Cargar-Imagen $Icono } catch { }
$ventana.Add_MouseLeftButtonDown({ $ventana.DragMove() })

function Vivo([int]$id) { return [bool](Get-Process -Id $id -ErrorAction SilentlyContinue) }

$inicio = Get-Date
$finInstalador = $null

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(500)
$timer.Add_Tick({
  $ahora = Get-Date
  if (($ahora - $inicio).TotalMinutes -gt 5) { $ventana.Close(); return }

  if (Vivo $InstaladorPid) {
    # Mientras la app vieja sigue abierta, Windows está revisando el
    # instalador; en cuanto el instalador la cierra, ya está copiando.
    if (Vivo $AppPid) { $sub.Text = 'Preparando la instalación…' }
    else { $sub.Text = 'Copiando los archivos nuevos…' }
    return
  }

  if (-not $script:finInstalador) {
    $script:finInstalador = $ahora
    # Si la app vieja sigue viva, la instalación no se hizo: la app ya
    # muestra el aviso en su propio splash.
    if (Vivo $AppPid) { $ventana.Close(); return }
    $titulo.Text = '¡Listo!'
    $sub.Text = 'Abriendo la app…'
  }

  $nueva = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $AppExe -and $_.MainWindowHandle -ne 0 }
  if ($nueva -or ($ahora - $script:finInstalador).TotalSeconds -gt 90) { $ventana.Close() }
})

$ventana.Add_ContentRendered({
  if ($Listo) { Set-Content -Path $Listo -Value $AppExe -Encoding UTF8 }
  $timer.Start()
})

[void]$ventana.ShowDialog()
