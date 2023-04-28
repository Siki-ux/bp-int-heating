// Encode encodes the given object into an array of bytes.
//  - fPort contains the LoRaWAN fPort number
//  - obj is an object, e.g. {"temperature": 22.5}
//  - variables contains the device variables e.g. {"calibration": "3.5"} (both the key / value are of type string)
// The function must return an array of bytes, e.g. [225, 230, 255, 0]
function Encode(fPort, obj, variables) {
    var resultArr = [];
    var warning = [];
    var cmd = obj;
        switch(cmd.cmdName){
            case "setTargetTemperature": 
            	var temp = cmd.cmdPars.targetTemperature;
            	if (temp < 5) temp = 5;
            	if (temp > 30) temp = 30;
                resultArr.unshift(14,temp);
                break;
            case "forceClose":
                resultArr.unshift(11);
                break;
            case "getChildLock":
                resultArr.unshift(20);
                break;
            case "getInternalAlgoParams":
                resultArr.unshift(22); 
                break;
            case "getInternalAlgoTdiffParams":
                resultArr.unshift(23); 
                break;
            case "getJoinRetryPeriod":
                resultArr.unshift(25); 
                break;
            case "getKeepAliveTime":
                resultArr.unshift(18); 
                break;
            case "getOpenWindowParams":
                resultArr.unshift(19); 
                break;
            case "getOperationalMode":
                resultArr.unshift(24); 
                break;
            case "getTemperatureRange":
                resultArr.unshift(21); 
                break;
            case "getUplinkType":
                resultArr.unshift(27); 
                break;
            case "recalibrateMotor":
                resultArr.unshift(3); 
                break;
            case "receivedKeepaliveCommand":
                resultArr.unshift(85); 
                break;
            case "setChildLock":
                var enable = cmd.cmdPars.enable ? 1:0;
                resultArr.unshift(7,enable); 
                break;
            case "setInternalAlgoParams":
                resultArr.unshift(12,cmd.cmdPars.period,cmd.cmdPars.pFirst,cmd.cmdPars.pNext); 
                break;
            case "setInternalAlgoTdiffParams":
                resultArr.unshift(26,cmd.cmdPars.cold,cmd.cmdPars.warm);
                break;
            case "setJoinRetryPeriod":
                resultArr.unshift(10,parseInt((cmd.cmdPars.value*60)/5)); 
                break;
            case "setKeepAlive":
                resultArr.unshift(2,parseInt(cmd.cmdPars.value)); 
                break;
            case "setOpenWindow":
                var enableValue = cmd.cmdPars.enable ? 1:0;
                var closeTimeValue = parseInt(cmd.cmdPars.closeTime)/5;
                var motorPositionBin = parseInt(cmd.cmdPars.motorPosition, 10).toString(2);
                motorPositionBin = motorPositionBin.substr(-12);
                var motorPositionFirstPart = parseInt(motorPositionBin.substr(4), 2, 16);
                var motorPositionSecondPart = parseInt(motorPositionBin.substr(0, 4), 2, 16);
                resultArr.unshift(6,enableValue,closeTimeValue,motorPositionFirstPart,motorPositionSecondPart,cmd.cmdPars.delta); 
                break;
            case "setOperationalMode":
                resultArr.unshift(13,cmd.cmdPars.mode); 
                break;
          	case "setExternalTemperatureSensorValue":
            	resultArr.unshift(15,cmd.cmdPars.temperature)
            	break;
            case "setTargetTemperatureAndMotorPosition":
            	var motorPosition = cmd.cmdPars.motorPosition;
            	var motorPositionHex;
            	if (motorPosition >= 0 && motorPosition <= 800){
                	motorPositionHex = motorPosition.toString(16);
                  	if (motorPositionHex.length  == 1){
    				    motorPositionHex = "000" + motorPositionHex;
    				}else if (motorPositionHex.length  == 2){
        				motorPositionHex = "00" + motorPositionHex;
    				}else if (motorPositionHex.length == 3){
       					motorPositionHex = "0"+ motorPositionHex;
   					}
                }else {
                	 motorPositionHex = "0000";
                }
            	var temp = cmd.cmdPars.targetTemperature;
            	if (temp < 5) temp = 5;
            	if (temp > 30) temp = 30;
      			var motorPositionMSB = parseInt(motorPositionHex.substr(0,2),16);
                var motorPositionLSB = parseInt(motorPositionHex.substr(2,4),16);
                resultArr.unshift(49,motorPositionMSB,motorPositionLSB,temp); 
                break;
          	case "setMotorPosition":
            	var motorPosition = cmd.cmdPars.motorPosition;
            	var motorPositionHex;
            	if (motorPosition >= 0 && motorPosition <=800){
                  	motorPositionHex = motorPosition.toString(16)
                    if (motorPositionHex.length  == 1){
                    	motorPositionHex = "000" + motorPositionHex;
                    }else if (motorPositionHex.length  == 2){
        				motorPositionHex = "00" + motorPositionHex;
    				}else if (motorPositionHex.length == 3){
       					motorPositionHex = "0 "+ motorPositionHex;
   					}
                }else {
                	motorPositionHex = "0000";
                }
      			var motorPositionMSB = parseInt(motorPositionHex.substr(0,2),16);
                var motorPositionLSB = parseInt(motorPositionHex.substr(2,4),16);
            	resultArr.unshift(45,motorPositionMSB,motorPositionLSB);
            	break;
            case "setTemperatureRange":
                resultArr.unshift(8,cmd.cmdPars.min,cmd.cmdPars.max); 
                break;
            case "setUplinkType":
                resultArr.unshift(17,cmd.cmdPars.type); 
                break;
            default:
                warning.push("command "+ cmd.cmdName +" not found");
                break;
        } 
    return resultArr;
}