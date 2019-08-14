$timesLeft=5;
$exit_code=1;

cd $PSScriptRoot;

while(($timesLeft -gt 0) -and ($exit_code -ne 0)){
    node ./grab.js
    $exit_code=$LASTEXITCODE;
    Write-Host Exited with $exit_code ,times left $timesLeft
    $timesLeft-=1;
}

if($timesLeft -lt 0){
	write-host "ERROR" >> error.log;
}