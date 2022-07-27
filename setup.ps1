write-host "`n  ## NODEJS INSTALLER ## `n"

### CONFIGURATION

$node_url = "https://nodejs.org/dist/v18.6.0/node-v18.6.0-x86.msi"
$git_url = "https://github.com/git-for-windows/git/releases/download/v2.37.1.windows.1/Git-2.37.1-64-bit.exe"
$python_url = "https://www.python.org/ftp/python/3.10.5/python-3.10.5-amd64.exe"
$mt_url = "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe?utm_source=www.metatrader5.com&utm_campaign=download"
# $chrome_url = "https://dl.google.com/tag/s/appguid%3A%7B9A7F1EBF-D8F9-4FF9-A3CB-E7F4A3D7AFDD%7D%7C%7B00000000-0000-0000-0000-000000000000%7D/installers/GoogleChromeStandalone.exe"
# activate / desactivate any install
$install_node = $TRUE
$install_git = $TRUE
$install_python = $TRUE
$install_mt = $TRUE
# $install_chrome = $TRUE

write-host "`n----------------------------"
write-host " system requirements checking  "
write-host "----------------------------`n"

### require administator rights

if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
   write-Warning "This setup needs admin permissions. Please run this file as admin."     
   break
}

### nodejs version check

if (Get-Command node -errorAction SilentlyContinue) {
    $current_version = (node -v)
}
 
if ($current_version) {
    write-host "[NODE] nodejs $current_version already installed"
    $confirmation = read-host "Are you sure you want to replace this version ? [y/N]"
    if ($confirmation -ne "y") {
        $install_node = $FALSE
    }
}

write-host "`n"

### git install

if ($install_git) {
    if (Get-Command git -errorAction SilentlyContinue) {
        $git_current_version = (git --version)
    }

    if ($git_current_version) {
        write-host "[GIT] $git_current_version detected. Proceeding ..."
    } else {
        $git_exe = "$PSScriptRoot\git-installer.exe"

        write-host "No git version dectected"

        $download_git = $TRUE
        
        if (Test-Path $git_exe) {
            $confirmation = read-host "Local git install file detected. Do you want to use it ? [Y/n]"
            if ($confirmation -eq "n") {
                $download_git = $FALSE
            }
        }

        if ($download_git) {
            write-host "downloading the git for windows installer"
        
            $start_time = Get-Date
            $wc = New-Object System.Net.WebClient
            $wc.DownloadFile($git_url, $git_exe)
            write-Output "git installer downloaded"
            write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s)"
        }
        
        write-host "proceeding with git install ..."
        write-host "running $git_exe"
        start-Process $git_exe -Wait 
        write-host "git installation done"
    }
}


if ($install_node) {
    
    ### download nodejs msi file
    # warning : if a node.msi file is already present in the current folder, this script will simply use it
        
    write-host "`n----------------------------"
    write-host "  nodejs msi file retrieving  "
    write-host "----------------------------`n"

    $filename = "node.msi"
    $node_msi = "$PSScriptRoot\$filename"
    
    $download_node = $TRUE

    if (Test-Path $node_msi) {
        $confirmation = read-host "Local $filename file detected. Do you want to use it ? [Y/n]"
        if ($confirmation -eq "n") {
            $download_node = $FALSE
        }
    }

    if ($download_node) {
        write-host "[NODE] downloading nodejs install"
        write-host "url : $node_url"
        $start_time = Get-Date
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($node_url, $node_msi)
        write-Output "$filename downloaded"
        write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s)"
    } else {
        write-host "using the existing node.msi file"
    }

    ### nodejs install

    write-host "`n----------------------------"
    write-host " nodejs installation  "
    write-host "----------------------------`n"

    write-host "[NODE] running $node_msi"
    Start-Process $node_msi -Wait 
    
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") 
    
} else {
    write-host "Proceeding with the previously installed nodejs version ..."
}

if ($install_python) {
    
    ### download python exe file
    # warning : if a python.exe file is already present in the current folder, this script will simply use it
        
    write-host "`n----------------------------"
    write-host "  python exe file retrieving  "
    write-host "----------------------------`n"

    $filename = "python.exe"
    $python_exe = "$PSScriptRoot\$filename"
    
    $download_python = $TRUE

    if (Test-Path $python_exe) {
        $confirmation = read-host "Local $filename file detected. Do you want to use it ? [Y/n]"
        if ($confirmation -eq "n") {
            $download_python = $FALSE
        }
    }

    if ($download_python) {
        write-host "[PYTHON] downloading python install"
        write-host "url : $python_url"
        $start_time = Get-Date
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($python_url, $python_exe)
        write-Output "$filename downloaded"
        write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s)"
    } else {
        write-host "using the existing python.exe file"
    }

    ### python install

    write-host "`n----------------------------"
    write-host " python installation  "
    write-host "----------------------------`n"

    write-host "[PYTHON] running $python_exe"
    Start-Process $python_exe -Wait 
    
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") 
    
} else {
    write-host "Proceeding with the previously installed python version ..."
}

if ($install_mt) {
    
    ### download python exe file
    # warning : if a metatrader5.exe file is already present in the current folder, this script will simply use it
        
    write-host "`n----------------------------"
    write-host "  metatrader exe file retrieving  "
    write-host "----------------------------`n"

    $filename = "metatrader.exe"
    $mt_exe = "$PSScriptRoot\$filename"
    
    $download_mt = $TRUE

    if (Test-Path $mt_exe) {
        $confirmation = read-host "Local $filename file detected. Do you want to use it ? [Y/n]"
        if ($confirmation -eq "n") {
            $download_mt = $FALSE
        }
    }

    if ($download_mt) {
        write-host "[MT] downloading metatrader install"
        write-host "url : $mt_url"
        $start_time = Get-Date
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($mt_url, $mt_exe)
        write-Output "$filename downloaded"
        write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s)"
    } else {
        write-host "using the existing metatrader.exe file"
    }

    ### metatrader install

    write-host "`n----------------------------"
    write-host " metatrader installation  "
    write-host "----------------------------`n"

    write-host "[MT] running $mt_exe"
    Start-Process $mt_exe -Wait 
    
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") 
    
} else {
    write-host "Proceeding with the previously installed metatrader version ..."
}




write-host "Done !"