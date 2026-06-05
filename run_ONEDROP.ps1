# ONEDROP Premium PowerShell Launcher Controller
# Designed for deep red/crimson aesthetics, system health checks, and automated starting.

$Host.UI.RawUI.WindowTitle = "ONEDROP Launcher Controller"
Clear-Host

# Color palette
$Crimson = "Red"
$Gray = "DarkGray"
$White = "White"
$Green = "Green"
$Yellow = "Yellow"

# Refresh environment variables from Registry to catch new installations
try {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $java_home_machine = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
    $java_home_user = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
    if ($null -ne $java_home_machine) { $env:JAVA_HOME = $java_home_machine }
    elseif ($null -ne $java_home_user) { $env:JAVA_HOME = $java_home_user }
} catch {}

$ToolsDir = "$PSScriptRoot\onedrop\tools"

function Initialize-PortableTools {
    # Check if local JDK exists and prepends to PATH
    $localJavaPath = "$ToolsDir\jdk-17"
    if (Test-Path $localJavaPath) {
        $javaExe = Get-ChildItem -Path $localJavaPath -Filter "java.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $javaExe) {
            $javaBin = Split-Path -Path $javaExe.FullName -Parent
            if ($env:PATH -notlike "*$javaBin*") {
                $env:PATH = "$javaBin;" + $env:PATH
            }
            $env:JAVA_HOME = Split-Path -Path $javaBin -Parent
        }
    }

    # Check if local Maven exists and prepends to PATH
    $localMavenPath = "$ToolsDir\maven"
    if (Test-Path $localMavenPath) {
        $mvnExe = Get-ChildItem -Path $localMavenPath -Filter "mvn.cmd" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $mvnExe) {
            $mvnBin = Split-Path -Path $mvnExe.FullName -Parent
            if ($env:PATH -notlike "*$mvnBin*") {
                $env:PATH = "$mvnBin;" + $env:PATH
            }
        }
    }
}

function Initialize-LocalJavaAndMaven {
    if (-not (Test-Path $ToolsDir)) {
        New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null
    }

    # 1. Verify/Download Java
    $javaFound = $false
    try {
        if ($null -ne (Get-Command java -ErrorAction SilentlyContinue)) {
            $javaFound = $true
        }
    } catch {}

    if (-not $javaFound) {
        $localJavaPath = "$ToolsDir\jdk-17"
        $javaExe = Get-ChildItem -Path $localJavaPath -Filter "java.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $javaExe) {
            $javaBin = Split-Path -Path $javaExe.FullName -Parent
            if ($env:PATH -notlike "*$javaBin*") {
                $env:PATH = "$javaBin;" + $env:PATH
            }
            $env:JAVA_HOME = Split-Path -Path $javaBin -Parent
            $javaFound = $true
        } else {
            Write-Host "  [!] Java (JDK 17) is missing but required for the Analytics Service." -ForegroundColor $Yellow
            $choice = Read-Host "      Would you like to automatically download a portable OpenJDK 17? (Y/N)"
            if ($choice -eq 'y' -or $choice -eq 'Y' -or $choice -eq '') {
                Write-Host "  [i] Downloading portable OpenJDK 17 (approx. 180MB)..." -ForegroundColor $White
                $jdkZip = "$ToolsDir\jdk.zip"
                $jdkUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
                
                # Download
                Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip
                Write-Host "  [i] Extracting OpenJDK 17..." -ForegroundColor $White
                Expand-Archive -Path $jdkZip -DestinationPath $ToolsDir -Force
                Remove-Item $jdkZip -Force
                
                # Find extracted folder and rename to jdk-17
                $extracted = Get-ChildItem -Path $ToolsDir -Directory | Where-Object { $_.Name -like "jdk-17*" -or $_.Name -like "jdk17*" } | Select-Object -First 1
                if ($null -ne $extracted) {
                    Rename-Item -Path $extracted.FullName -NewName "jdk-17" -Force
                }
                
                # Activate
                $javaExe = Get-ChildItem -Path $localJavaPath -Filter "java.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($null -ne $javaExe) {
                    $javaBin = Split-Path -Path $javaExe.FullName -Parent
                    $env:PATH = "$javaBin;" + $env:PATH
                    $env:JAVA_HOME = Split-Path -Path $javaBin -Parent
                    $javaFound = $true
                    Write-Host "  [+] Portable OpenJDK 17 configured successfully!" -ForegroundColor $Green
                }
            }
        }
    }

    # 2. Verify/Download Maven
    $mvnFound = $false
    try {
        if ($null -ne (Get-Command mvn -ErrorAction SilentlyContinue)) {
            $mvnFound = $true
        }
    } catch {}

    if (-not $mvnFound) {
        $localMavenPath = "$ToolsDir\maven"
        $mvnExe = Get-ChildItem -Path $localMavenPath -Filter "mvn.cmd" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $mvnExe) {
            $mvnBin = Split-Path -Path $mvnExe.FullName -Parent
            if ($env:PATH -notlike "*$mvnBin*") {
                $env:PATH = "$mvnBin;" + $env:PATH
            }
            $mvnFound = $true
        } else {
            Write-Host "  [!] Maven is missing but required to build and run the Analytics Service." -ForegroundColor $Yellow
            $choice = Read-Host "      Would you like to automatically download portable Apache Maven? (Y/N)"
            if ($choice -eq 'y' -or $choice -eq 'Y' -or $choice -eq '') {
                Write-Host "  [i] Downloading portable Apache Maven (approx. 10MB)..." -ForegroundColor $White
                $mvnZip = "$ToolsDir\maven.zip"
                $mvnUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"
                
                # Download
                Invoke-WebRequest -Uri $mvnUrl -OutFile $mvnZip
                Write-Host "  [i] Extracting Maven..." -ForegroundColor $White
                Expand-Archive -Path $mvnZip -DestinationPath $ToolsDir -Force
                Remove-Item $mvnZip -Force
                
                # Find extracted folder and rename to maven
                $extracted = Get-ChildItem -Path $ToolsDir -Directory | Where-Object { $_.Name -like "apache-maven*" } | Select-Object -First 1
                if ($null -ne $extracted) {
                    Rename-Item -Path $extracted.FullName -NewName "maven" -Force
                }
                
                # Activate
                $mvnExe = Get-ChildItem -Path $localMavenPath -Filter "mvn.cmd" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($null -ne $mvnExe) {
                    $mvnBin = Split-Path -Path $mvnExe.FullName -Parent
                    $env:PATH = "$mvnBin;" + $env:PATH
                    $mvnFound = $true
                    Write-Host "  [+] Portable Apache Maven configured successfully!" -ForegroundColor $Green
                }
            }
        }
    }
}

function Show-Header {
    Write-Host @"
    
  ██████╗  █████╗ ██╗  ██╗████████╗███████╗███████╗████████╗██╗   ██╗
  ██╔══██╗██╔══██╗██║ ██╔╝╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║   ██║
  ██████╔╝███████║█████╔╝    ██║   ███████╗█████╗     ██║   ██║   ██║
  ██╔══██╗██╔══██║██╔═██╗    ██║   ╚════██║██╔══╝     ██║   ██║   ██║
  ██║  ██║██║  ██║██║  ██╗   ██║   ███████║███████╗   ██║   ╚██████╔╝
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝   ╚═╝    ╚═════╝ 
  
"@ -ForegroundColor $Crimson

    Write-Host "  ===============================================================" -ForegroundColor $Gray
    Write-Host "           ONEDROP Integrated Blood Donation & AI Platform" -ForegroundColor $White
    Write-Host "  ===============================================================" -ForegroundColor $Gray
    Write-Host ""
}

function Test-Dependency ($Name, $Command, $Arg) {
    Write-Host "  Checking for $Name... " -NoNewline -ForegroundColor $White
    $found = $false
    try {
        if ($null -ne (Get-Command $Command -ErrorAction SilentlyContinue)) {
            $found = $true
        }
    } catch {}

    if ($found) {
        Write-Host "[ OK ]" -ForegroundColor $Green
        return $true
    } else {
        Write-Host "[ MISSING ]" -ForegroundColor $Crimson
        return $false
    }
}

function Test-Mongo {
    Write-Host "  Checking MongoDB (Port 27017)... " -NoNewline -ForegroundColor $White
    $mongoRunning = $false
    try {
        $tcpConnection = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 27017)
        if ($tcpConnection.Connected) {
            $mongoRunning = $true
            $tcpConnection.Close()
        }
    } catch {}

    if ($mongoRunning) {
        Write-Host "[ RUNNING ]" -ForegroundColor $Green
        return $true
    } else {
        Write-Host "[ NOT RUNNING ]" -ForegroundColor $Yellow
        return $false
    }
}

function Test-NodeModules ($Path) {
    return (Test-Path "$Path\node_modules")
}

# 1. Show Header
Show-Header

Initialize-PortableTools

# 2. Run Diagnostics
Write-Host "  [System Diagnostics]" -ForegroundColor $Crimson
$nodeOk = Test-Dependency "Node.js" "node" "--version"
$dockerOk = Test-Dependency "Docker" "docker" "--version"
$mongoOk = Test-Mongo
Write-Host ""

# Ensure Node modules are installed if Node.js is present
$serverRoot = "$PSScriptRoot\onedrop\server"
$clientRoot = "$PSScriptRoot\onedrop\client"

$serverModules = Test-NodeModules $serverRoot
$clientModules = Test-NodeModules $clientRoot

if ($nodeOk) {
    if (-not $serverModules -or -not $clientModules) {
        Write-Host "  [!] Missing dependencies detected in backend or frontend!" -ForegroundColor $Yellow
        $choice = Read-Host "  Would you like to install dependencies first? (Y/N)"
        if ($choice -eq 'y' -or $choice -eq 'Y' -or $choice -eq '') {
            Write-Host "`n  Installing/restoring package dependencies..." -ForegroundColor $White
            if (-not $serverModules) {
                Write-Host "  -> Server package setup..." -ForegroundColor $Gray
                Start-Process cmd -ArgumentList "/c npm install" -WorkingDirectory $serverRoot -NoNewWindow -Wait
            }
            if (-not $clientModules) {
                Write-Host "  -> Client package setup..." -ForegroundColor $Gray
                Start-Process cmd -ArgumentList "/c npm install" -WorkingDirectory $clientRoot -NoNewWindow -Wait
            }
            Write-Host "  Dependencies restored successfully!`n" -ForegroundColor $Green
        }
    }
}

# 3. Interactive Menu Loop
while ($true) {
    Clear-Host
    Show-Header
    
    if (-not $mongoOk -and -not $dockerOk) {
        Write-Host "  [!] WARNING: MongoDB is not running, and Docker was not found." -ForegroundColor $Yellow
        Write-Host "      Please make sure MongoDB is running to let the Backend connect.`n" -ForegroundColor $Yellow
    } elseif (-not $mongoOk -and $dockerOk) {
        Write-Host "  [i] TIP: MongoDB is not running locally. You can start it via Docker Compose (Option 3).`n" -ForegroundColor $Yellow
    }

    Write-Host "  Please select an execution mode:" -ForegroundColor $White
    Write-Host "  --------------------------------" -ForegroundColor $Gray
    Write-Host "  [1] Launch Core App (Backend + Frontend React Client) [RECOMMENDED]" -ForegroundColor $White
    Write-Host "  [2] Launch Full Platform (Backend, Frontend, ML Service, Analytics)" -ForegroundColor $White
    Write-Host "  [3] Launch using Docker Compose (Isolated Containerized Environment)" -ForegroundColor $White
    Write-Host "  [4] Run Package Dependency Update (npm install for client & server)" -ForegroundColor $White
    Write-Host "  [5] Exit Launcher" -ForegroundColor $White
    Write-Host ""
    
    $selection = Read-Host "  Enter choice (1-5)"
    
    switch ($selection) {
        "1" {
            Write-Host "`n  Spawning Core ONEDROP Application..." -ForegroundColor $Green
            
            # Start Backend
            $backendArgs = "-NoExit -Command `"cd '$serverRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Backend Server'; npm run dev`""
            Start-Process powershell -ArgumentList $backendArgs -WorkingDirectory $serverRoot
            
            # Start Frontend
            $clientArgs = "-NoExit -Command `"cd '$clientRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Frontend Client'; npm run dev`""
            Start-Process powershell -ArgumentList $clientArgs -WorkingDirectory $clientRoot
            
            Write-Host "  Core services spawned in separate terminal windows!" -ForegroundColor $Green
            Start-Sleep -Seconds 3
            Exit
        }
        "2" {
            # Ensure we have Java and Maven for the Analytics Service
            Initialize-LocalJavaAndMaven
            
            Write-Host "`n  Spawning Full ONEDROP System Architecture..." -ForegroundColor $Green
            
            # Start Backend
            $backendArgs = "-NoExit -Command `"cd '$serverRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Backend Server'; npm run dev`""
            Start-Process powershell -ArgumentList $backendArgs -WorkingDirectory $serverRoot
            
            # Start Frontend
            $clientArgs = "-NoExit -Command `"cd '$clientRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Frontend Client'; npm run dev`""
            Start-Process powershell -ArgumentList $clientArgs -WorkingDirectory $clientRoot

            # Start AI/ML Service
            $mlRoot = "$PSScriptRoot\onedrop\ml-service"
            if (Test-Path "$mlRoot\venv") {
                $mlArgs = "-NoExit -Command `"cd '$mlRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Machine Learning Service'; .\venv\Scripts\activate; python -m app.main`""
            } else {
                $mlArgs = "-NoExit -Command `"cd '$mlRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Machine Learning Service'; python -m app.main`""
            }
            Start-Process powershell -ArgumentList $mlArgs -WorkingDirectory $mlRoot

            # Start Analytics Service
            $analyticsRoot = "$PSScriptRoot\onedrop\analytics-service"
            $jarFile = "$analyticsRoot\target\analytics-service-0.0.1-SNAPSHOT.jar"
            
            # Construct bulletproof environment setup string for spawned shells
            $envSetup = ""
            if ($null -ne $env:JAVA_HOME) {
                $envSetup += "`$env:JAVA_HOME = '$env:JAVA_HOME'; "
            }
            $envSetup += "`$env:PATH = '$env:PATH'; "

            if (Test-Path $jarFile) {
                $analyticsArgs = "-NoExit -Command `"$envSetup cd '$analyticsRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Analytics Service'; java -jar target/analytics-service-0.0.1-SNAPSHOT.jar`""
            } else {
                # Fallback to build with mvnw if available, or try to run maven
                if (Test-Path "$analyticsRoot\mvnw") {
                    $analyticsArgs = "-NoExit -Command `"$envSetup cd '$analyticsRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Analytics Service'; .\mvnw spring-boot:run`""
                } else {
                    $analyticsArgs = "-NoExit -Command `"$envSetup cd '$analyticsRoot'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Analytics Service'; mvn spring-boot:run`""
                }
            }
            Start-Process powershell -ArgumentList $analyticsArgs -WorkingDirectory $analyticsRoot
            
            Write-Host "  All services spawned in separate terminal windows!" -ForegroundColor $Green
            Start-Sleep -Seconds 3
            Exit
        }
        "3" {
            if (-not $dockerOk) {
                Write-Host "`n  [Error] Docker is not installed or not running. Cannot use Docker Compose." -ForegroundColor $Crimson
                Start-Sleep -Seconds 3
                continue
            }
            Write-Host "`n  Launching Multi-Container Environment via Docker Compose..." -ForegroundColor $Green
            $dockerArgs = "-NoExit -Command `"cd '$PSScriptRoot\onedrop'; `$Host.UI.RawUI.WindowTitle = 'ONEDROP Docker Containers'; docker-compose up --build`""
            Start-Process powershell -ArgumentList $dockerArgs -WorkingDirectory "$PSScriptRoot\onedrop"
            Exit
        }
        "4" {
            Write-Host "`n  Reinstalling and updating dependencies for all core applications..." -ForegroundColor $Yellow
            Write-Host "  -> Updating Backend..." -ForegroundColor $Gray
            Start-Process cmd -ArgumentList "/c npm install" -WorkingDirectory $serverRoot -NoNewWindow -Wait
            Write-Host "  -> Updating Frontend..." -ForegroundColor $Gray
            Start-Process cmd -ArgumentList "/c npm install" -WorkingDirectory $clientRoot -NoNewWindow -Wait
            Write-Host "  Dependency update completed successfully!`n" -ForegroundColor $Green
            Write-Host "  Press any key to return to main menu..." -ForegroundColor $Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "5" {
            Write-Host "`n  Exiting launcher. Have a wonderful day!" -ForegroundColor $White
            Start-Sleep -Seconds 1
            Exit
        }
        Default {
            Write-Host "`n  Invalid option. Please choose between 1 and 5." -ForegroundColor $Crimson
            Start-Sleep -Seconds 1.5
        }
    }
}
