"use strict";
/***
 * @author: xsikul@stud.fit.vutbr.cz, Jakub Sikula
 * This script contains whole heating service.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatingControl = void 0;
const data = __importStar(require("../index"));
//enable console output
let consoleEN = 0;
class PIDController {
    constructor(setpoint, kp, ki, kd, outputLimits, integral, prevError, time) {
        this.setpoint = setpoint;
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.integral = integral;
        this.prevError = prevError;
        this.startTime = time;
        this.outputLimits = outputLimits;
    }
    /***Function which calculate PID regulation and updates dummy database
    * @returns: new calculated motor position
    */
    calculateOutput(processVariable, time) {
        if (consoleEN)
            console.log("\tPID algo: Input: " + processVariable + "\tsetpoit: " + this.setpoint + "\tkp: " + this.kp + "\tki: " + this.ki + "\tkd: " + this.kd + "\tIntegral: " + this.integral + "\tprevError: " + this.prevError + "\tstartTime: " + this.startTime + "\tTime: " + time + "\tLimits: [" + this.outputLimits[0] + "," + this.outputLimits[1] + "]");
        const currentTime = time;
        const elapsedTime = currentTime - this.startTime;
        const error = this.setpoint - processVariable;
        const deltaError = error - this.prevError;
        this.prevError = error;
        this.integral += error * elapsedTime;
        data.updatePID(this.prevError, this.integral);
        const derivative = deltaError / elapsedTime;
        const output = this.kp * error + this.ki * this.integral + this.kd * derivative;
        const limitedOutput = Math.min(Math.max(output, this.outputLimits[0]), this.outputLimits[1]);
        return limitedOutput;
    }
}
class HeatingControl {
    constructor() {
        this.trvModelId = 113;
        this.tSensModelID = 2;
        this.tSensTemperatureIndex = 0;
        this.trvCMDsetMotorPositionID = 9;
        this.trvCMDsetMotorPositionAndTargetID = 4;
        this.motorLowLimit = 1;
        this.motorHighLimit = 800;
        this.coeficientHighLimit = 20;
        this.coeficientLowLimit = 1;
        this.criticalCooling = 2;
    }
    /**Function which update databse. Not needed in simulation*/
    updateLastValue(measuredT, motorPosition, trvID) {
        return __awaiter(this, void 0, void 0, function* () {
            if (consoleEN)
                console.log("\tUpdated 'lastMeasuredTemperature' to:" + measuredT + "\n\tUpdated 'motorPosition' to:" + motorPosition);
        });
    }
    /**Function which calculate proportional regulation.
     * @returns new calculated motor position
    */
    HeatingAlgo(MPold, c, Ttarget, Tmeasured, MR) {
        let MPnew = Math.round(MPold - ((c * (Ttarget - Tmeasured) * MR) / 100));
        if (consoleEN)
            console.log("\t\tCalculating new MP:" + MPnew);
        if (Math.abs(MPnew - MPold) < 17)
            return MPold;
        if (MPnew >= MR)
            return MR;
        if (MPnew < 0)
            return 0;
        return MPnew;
    }
    /**Function which gets numeric value from databse and checks if it is within limits
     * @returns parameter number
    */
    getNumericParam(trvParamList, paramName, lowLimit, highLimit) {
        for (var index in trvParamList) {
            if (trvParamList[index].devParName === paramName) {
                let value = trvParamList[index].value;
                if (typeof value === "number") {
                    if (value < lowLimit && value > highLimit)
                        break;
                    return value;
                }
                throw new Error("In Heating control, [" + paramName + "] in not valid");
            }
        }
        throw new Error("Could not get [" + paramName + "] from db for HeatingControl");
    }
    /**Function which cycle through all sensors in group to calculate mean temperature in room. If none are present uses TRV temp
     * @returns room temperature
    */
    getRoomTemp(trvMeasuredT) {
        let sensors = data.deviceList;
        let roomTemp;
        if (consoleEN)
            console.log("\tGroup contains " + sensors.length + " tSens sensor/s");
        if (sensors.length >= 1) {
            let total = 0.0;
            for (var zndex in sensors) {
                let sensorID = sensors[zndex].id;
                if (typeof sensorID === "undefined")
                    continue;
                let sensor = data.getDeviceParameterValueList(sensorID);
                let temp = sensor[this.tSensTemperatureIndex].value;
                if (typeof temp !== "number")
                    continue;
                total += temp;
            }
            roomTemp = Math.round((total / sensors.length) * 100) / 100;
        }
        else {
            if (consoleEN)
                console.log("\t***No tSens sensors found! Room temp = TRV measured***");
            roomTemp = trvMeasuredT;
        }
        return roomTemp;
    }
    /**Function which controls TRV regulators.
     * @returns Info about regulation process.
     */
    HeatingControl() {
        //only dummy database needed in simulation
        let TRVs = data.TRVs;
        let dat = [];
        if (consoleEN)
            console.log("starting HeatingControl\nFound " + TRVs.length + " TRVs");
        //if there is no online device to control -> END
        if (TRVs.length < 1) {
            return {
                status: 0,
                statusStr: 'Stoped HeatingControl!',
                data: null,
                error: "No devices to control",
            };
        }
        //Cycle through all controlable devices. Skip devices with incorrect data
        for (var index in TRVs) {
            let trvID = TRVs[index].id;
            if (typeof trvID === "undefined")
                continue;
            let systemID = TRVs[index].mnSystemId;
            if (typeof systemID === "undefined")
                continue;
            let groups = data.groups;
            if (groups.length < 1)
                continue;
            if (consoleEN)
                console.log("Checking TRV " + trvID + "; in System " + systemID);
            //Cycle through all groups (rooms) in which is device located. Skip groups with incorrect data
            for (var jndex in groups) {
                let groupID = groups[jndex].id;
                if (typeof groupID === "undefined")
                    continue;
                if (consoleEN)
                    console.log("\tChecking Group " + groupID);
                //Try to get all requierd data from database or FIAL control
                let trvParamList = data.getDeviceTrvValueList();
                let trvMotorOld, trvMotorRange, trvTargetT, trvMeasuredT, trvLastMeasuredT, trvCoeficient, integral, prevError, startTime, currTime, roomTemp;
                try {
                    trvMotorOld = Math.round(this.getNumericParam(trvParamList, "motorPosition", this.motorLowLimit, this.motorHighLimit));
                    trvMotorRange = Math.round(this.getNumericParam(trvParamList, "motorRange", this.motorLowLimit, this.motorHighLimit));
                    trvTargetT = Math.round(this.getNumericParam(trvParamList, "targetTemperature", 1, 100) * 100) / 100;
                    trvMeasuredT = Math.round(this.getNumericParam(trvParamList, "sensorTemperature", -100, 100) * 100) / 100;
                    trvLastMeasuredT = Math.round(this.getNumericParam(trvParamList, "lastMeasuredTemperature", -100, 100) * 100) / 100;
                    trvCoeficient = Math.round(this.getNumericParam(trvParamList, "coeficient", this.coeficientLowLimit, this.coeficientHighLimit));
                    integral = this.getNumericParam(trvParamList, "integral", -100, 100);
                    prevError = this.getNumericParam(trvParamList, "prevError", -100, 100);
                    startTime = this.getNumericParam(trvParamList, "startTime", 0, Number.MAX_VALUE);
                    currTime = this.getNumericParam(trvParamList, "currTime", 0, Number.MAX_VALUE);
                    roomTemp = this.getRoomTemp(trvMeasuredT);
                }
                catch (e) {
                    let msg;
                    if (e instanceof Error)
                        msg = e.message;
                    return {
                        status: 1,
                        statusStr: 'FAILED HeatingControl!',
                        data: null,
                        error: msg
                    };
                }
                if (consoleEN)
                    console.log("\ttSens sensors mean temperature is " + roomTemp + "\n\tTRV motor position is " + trvMotorOld + "\n\tTRV motor range is " + trvMotorRange + "\n\tTRV target temperature is " + trvTargetT);
                if (consoleEN)
                    console.log("\tTRV measured temperature is " + trvMeasuredT + "\n\tTRV (tSens) last measured temperature is " + trvLastMeasuredT + "\n\tTRV coeficient is " + trvCoeficient);
                //Calculate new motor position 
                let trvNewMotorPositionArr = this.HeatingControlLogic(trvMotorOld, trvMotorRange, trvCoeficient, trvTargetT, roomTemp, trvLastMeasuredT, integral, prevError, startTime, currTime);
                dat = trvNewMotorPositionArr;
                if (consoleEN)
                    console.log("\tNew calculated motor position is " + trvNewMotorPositionArr[0].value);
                //If change is required, try to launch new command. Not needed in simulation 
                if (trvNewMotorPositionArr[0].value != trvMotorOld) {
                    try {
                        if (consoleEN)
                            console.log("\t\tLaunching command " + this.trvCMDsetMotorPositionID + " for " + trvID + " with MP: " + trvNewMotorPositionArr[0].value);
                    }
                    catch (e) {
                        let msg;
                        if (e instanceof Error)
                            msg = e.message;
                        return {
                            status: 1,
                            statusStr: 'FAILED HeatingControl! at Launching stage',
                            data: null,
                            error: msg
                        };
                    }
                }
                //Try to update database
                try {
                    this.updateLastValue(roomTemp, trvNewMotorPositionArr[0].value, trvID);
                }
                catch (e) {
                    let msg;
                    if (e instanceof Error)
                        msg = e.message;
                    return {
                        status: 0,
                        statusStr: 'FAILED HeatingControl! at update of last value',
                        data: null,
                        error: msg
                    };
                }
            }
        }
        return {
            status: 0,
            statusStr: 'OK Heating!',
            data: dat,
            error: null
        };
    }
    /**Function which checks PID calculation and formats them
     * @returns Array containg result data
     */
    PIDregulation(PID, motorOld, motorRange, targetT) {
        let mpPID = 800 - PID;
        if (Math.abs(mpPID - motorOld) < 17)
            mpPID = motorOld;
        if (mpPID >= motorRange)
            mpPID = motorRange;
        if (mpPID < 0)
            mpPID = 0;
        let parValArr = [
            {
                devParName: "motorPosition",
                value: mpPID
            }, {
                devParName: "targetTemperature",
                value: targetT
            }, {
                devParName: "PID",
                value: PID
            }
        ];
        return parValArr;
    }
    /**Function which runs heating algorithm and formats output
     * @returns Array containg result data
     */
    HeatingControlLogic(motorOld, motorRange, c, targetT, measuredT, lastMeasuredT, integral, prevError, startTime, currTime) {
        let pidController = new PIDController(targetT, 20, 1, 1, [0, motorRange], integral, prevError, startTime);
        let PID = Math.round(pidController.calculateOutput(measuredT, currTime));
        let parValArr = [
            {
                devParName: "motorPosition",
                value: motorOld
            }, {
                devParName: "targetTemperature",
                value: targetT
            }, {
                devParName: "PID",
                value: PID
            }
        ];
        if (Math.abs(targetT - measuredT) > 0.3) {
            // heating
            if (measuredT < targetT) {
                if ((measuredT < lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld, c, targetT, measuredT, motorRange);
                }
                else if (targetT - measuredT > 0.8) {
                    parValArr[0].value = this.HeatingAlgo(motorOld, c * 2, targetT, measuredT, motorRange);
                }
                // cooling
            }
            else {
                if ((measuredT > lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld, c, targetT, measuredT, motorRange);
                }
                else if (measuredT - targetT > 0.8) {
                    parValArr[0].value = this.HeatingAlgo(motorOld, c * 2, targetT, measuredT, motorRange);
                }
            }
        }
        //Uncomment this line to enable PIDregulation
        //parValArr = this.PIDregulation(PID,motorOld,motorRange,targetT);
        return parValArr;
    }
}
exports.HeatingControl = HeatingControl;
