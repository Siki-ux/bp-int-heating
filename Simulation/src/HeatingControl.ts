/***
 * @author: xsikul@stud.fit.vutbr.cz, Jakub Sikula
 * This script contains whole heating service.
 */

import * as data from "../index";

//enable console output
let consoleEN = 0;

class PIDController {
    private setpoint: number;
    private kp: number;
    private ki: number;
    private kd: number;
    private integral: number;
    private prevError: number;
    private startTime: number;
    private outputLimits: [number, number];

    constructor(setpoint: number, kp: number, ki: number, kd: number, outputLimits: [number, number], integral: number, prevError:number, time:number) {
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
    calculateOutput(processVariable: number,time:number): number {
        
        if(consoleEN)console.log("\tPID algo: Input: " + processVariable + "\tsetpoit: "+this.setpoint+"\tkp: "+this.kp+"\tki: "+this.ki+"\tkd: "+this.kd+"\tIntegral: "+this.integral+"\tprevError: "+this.prevError+"\tstartTime: "+this.startTime+"\tTime: "+time+"\tLimits: ["+this.outputLimits[0]+","+this.outputLimits[1]+"]");
        


        const currentTime: number = time;
        const elapsedTime: number = currentTime - this.startTime;
    
        const error: number = this.setpoint - processVariable;
        const deltaError: number = error - this.prevError;
        this.prevError = error;
    
        this.integral += error * elapsedTime;

        data.updatePID(this.prevError,this.integral);

        const derivative: number = deltaError / elapsedTime;
    
        const output: number = this.kp * error + this.ki * this.integral + this.kd * derivative;
        const limitedOutput: number = Math.min(Math.max(output, this.outputLimits[0]), this.outputLimits[1]);
    
        return limitedOutput;
    }
}

/**Defined return data from heating algorithm */
export interface HeatingRet {
    status: number;
    statusStr: string;
    data: any;
    error: any;
  }


export class HeatingControl{

    private trvModelId = 113;
    private tSensModelID = 2;
    private tSensTemperatureIndex = 0;
    private trvCMDsetMotorPositionID = 9;
    private trvCMDsetMotorPositionAndTargetID = 4;
    private motorLowLimit = 1;
    private motorHighLimit = 800;
    private coeficientHighLimit = 20;
    private coeficientLowLimit = 1;

    private criticalCooling = 2;

    
    /**Function which update database. Not needed in simulation*/
    private async updateLastValue(measuredT:number,motorPosition:number,trvID:number){
        if(consoleEN)console.log("\tUpdated 'lastMeasuredTemperature' to:" + measuredT + "\n\tUpdated 'motorPosition' to:" + motorPosition);
    }

    /**Function which calculate proportional regulation.
     * @returns new calculated motor position
    */
    private HeatingAlgo(MPold:number,c:number,Ttarget:number,Tmeasured:number,MR:number):number{
        
        let MPnew = Math.round(MPold-((c*(Ttarget-Tmeasured)*MR)/100));
        if(consoleEN)console.log("\t\tCalculating new MP:" +MPnew);
        if ( Math.abs(MPnew-MPold) < 17)
            return MPold;
        if ( MPnew >= MR)
            return MR;
        if ( MPnew < 0)
            return 0;
        return MPnew;
    }

    /**Function which gets numeric value from databse and checks if it is within limits
     * @returns parameter number
    */
    private getNumericParam(trvParamList:any[],paramName:string,lowLimit:number,highLimit:number):number{
        for(var index in trvParamList){
            if(trvParamList[index].devParName === paramName){
                let value = trvParamList[index].value;
                if (typeof value === "number") {
                    if (value < lowLimit && value > highLimit) break;
                    return value;
                }
                throw new Error("In Heating control, ["+paramName+"] in not valid");
            }  
        }
        throw new Error("Could not get ["+paramName+"] from db for HeatingControl");
    }
    /**Function which cycle through all sensors in group to calculate mean temperature in room. If none are present uses TRV temp
     * @returns room temperature
    */
    private getRoomTemp(trvMeasuredT:number):number{
        let sensors = data.deviceList;
        let roomTemp;
        if(consoleEN)console.log("\tGroup contains "+sensors.length+" tSens sensor/s")
        if (sensors.length >= 1){
            let total = 0.0;
            for(var zndex in sensors) {
                let sensorID = sensors[zndex].id;
                if (typeof sensorID === "undefined") continue;

                let sensor = data.getDeviceParameterValueList(sensorID);
                let temp = sensor[this.tSensTemperatureIndex].value;
                if (typeof temp !== "number") continue;

                total += temp;
            }
            roomTemp = Math.round((total/sensors.length)*100)/100;

        }else {
            if(consoleEN)console.log("\t***No tSens sensors found! Room temp = TRV measured***");
            roomTemp = trvMeasuredT;
        }
        return roomTemp;
    }
    
    /**Function which controls TRV regulators.
     * @returns Info about regulation process.
     */
    public HeatingControl():HeatingRet{
        //only dummy database needed in simulation
        let TRVs = data.TRVs;
        let dat:any=[];
        if(consoleEN)console.log("starting HeatingControl\nFound "+TRVs.length+" TRVs");

        //if there is no online device to control -> END
        if (TRVs.length < 1) {
            return {
                status: 0,
                statusStr: 'Stoped HeatingControl!',
                data: null,
                error: "No devices to control",
            } as HeatingRet; 
        }

        //Cycle through all controlable devices. Skip devices with incorrect data
        for(var index in TRVs){
            
            let trvID = TRVs[index].id;
            if (typeof trvID === "undefined") continue;

            let systemID = TRVs[index].mnSystemId;
            if (typeof systemID === "undefined") continue;


            let groups = data.groups;
            if (groups.length < 1) continue;

            if(consoleEN)console.log("Checking TRV "+trvID+"; in System "+systemID)
            //Cycle through all groups (rooms) in which is device located. Skip groups with incorrect data
            for(var jndex in groups){
                let groupID = groups[jndex].id;
                if (typeof groupID === "undefined") continue;
                if(consoleEN)console.log("\tChecking Group "+groupID);
                //Try to get all requierd data from database or FIAL control
                let trvParamList =  data.getDeviceTrvValueList();
                let trvMotorOld:number,trvMotorRange:number,trvTargetT:number,trvMeasuredT:number,trvLastMeasuredT:number,trvCoeficient:number,integral:number,prevError:number,startTime:number,currTime:number,roomTemp:number;
                try {
                    trvMotorOld = Math.round(this.getNumericParam(trvParamList,"motorPosition",this.motorLowLimit,this.motorHighLimit));       
                    trvMotorRange = Math.round(this.getNumericParam(trvParamList,"motorRange",this.motorLowLimit,this.motorHighLimit));
                    trvTargetT = Math.round(this.getNumericParam(trvParamList,"targetTemperature",1,100)*100)/100;
                    trvMeasuredT = Math.round(this.getNumericParam(trvParamList,"sensorTemperature",-100,100)*100)/100;
                    trvLastMeasuredT = Math.round(this.getNumericParam(trvParamList,"lastMeasuredTemperature",-100,100)*100)/100;
                    trvCoeficient = Math.round(this.getNumericParam(trvParamList,"coeficient",this.coeficientLowLimit,this.coeficientHighLimit));
                    integral = this.getNumericParam(trvParamList,"integral",-100,100);
                    prevError = this.getNumericParam(trvParamList,"prevError",-100,100);
                    startTime = this.getNumericParam(trvParamList,"startTime",0,Number.MAX_VALUE);
                    currTime = this.getNumericParam(trvParamList,"currTime",0,Number.MAX_VALUE);
                    roomTemp = this.getRoomTemp(trvMeasuredT);
                } catch(e){
                    let msg;
                    if (e instanceof Error)
                        msg = e.message;
                    return {
                        status: 1,
                        statusStr: 'FAILED HeatingControl!',
                        data: null,
                        error: msg
                    } as HeatingRet;
                }   
                
                if(consoleEN)console.log("\tRoom temperature is "+roomTemp + "\n\tTRV motor position is "+trvMotorOld + "\n\tTRV motor range is "+trvMotorRange +"\n\tTRV target temperature is "+trvTargetT);
                if(consoleEN)console.log("\tTRV measured temperature is "+trvMeasuredT + "\n\tRoom last measured temperature is "+trvLastMeasuredT + "\n\tTRV coeficient is "+trvCoeficient);
                
                //Calculate new motor position 
                let trvNewMotorPositionArr = this.HeatingControlLogic(trvMotorOld,trvMotorRange,trvCoeficient,trvTargetT,roomTemp,trvLastMeasuredT,integral,prevError,startTime,currTime);
                dat = trvNewMotorPositionArr;

                if(consoleEN)console.log("\tNew calculated motor position is "+trvNewMotorPositionArr[0].value);

                //If change is required, try to launch new command. Not needed in simulation 
                if (trvNewMotorPositionArr[0].value != trvMotorOld){
                    try {
                        if(consoleEN)console.log("\t\tLaunching command "+this.trvCMDsetMotorPositionID+" for "+trvID+" with MP: "+trvNewMotorPositionArr[0].value);
                    }catch (e){
                        let msg;
                        if (e instanceof Error)
                            msg = e.message;
                        return {
                            status: 1,
                            statusStr: 'FAILED HeatingControl! at Launching stage',
                            data: null,
                            error: msg
                        } as HeatingRet;
                    }
                }

                //Try to update database
                try {
                    this.updateLastValue(roomTemp,trvNewMotorPositionArr[0].value,trvID);
                }catch (e){
                    let msg;
                    if (e instanceof Error)
                        msg = e.message;
                    return {
                        status: 0,
                        statusStr: 'FAILED HeatingControl! at update of last value',
                        data: null,
                        error: msg
                    } as HeatingRet;
                }
                
            }
        }
        return {
            status: 0,
            statusStr: 'OK Heating!',
            data: dat,
            error: null
        } as HeatingRet;   
    }

    /**Function which checks PID calculation and formats them 
     * @returns Array containg result data
     */
    private PIDregulation(PID:number,motorOld:number,motorRange:number,targetT:number):any[]{
        let mpPID = 800-PID;

        if ( Math.abs(mpPID-motorOld) < 17) mpPID = motorOld;
        if ( mpPID >= motorRange) mpPID = motorRange;
        if ( mpPID < 0) mpPID = 0;
        
        
        let parValArr:any[]=[
            {
                devParName: "motorPosition",
                value: mpPID
            },{
                devParName: "targetTemperature",
                value: targetT
            },{
                devParName: "PID",
                value: PID
            }
        ];

        return parValArr
    }

    /**Function which runs heating algorithm and formats output
     * @returns Array containg result data
     */
    private HeatingControlLogic(motorOld:number,motorRange:number,c:number,targetT:number,measuredT:number,lastMeasuredT:number,integral:number,prevError:number,startTime:number,currTime:number):any[]{

        let pidController = new PIDController(targetT, 20, 1, 1, [0, motorRange],integral,prevError,startTime);
        let PID = Math.round(pidController.calculateOutput(measuredT,currTime));

        let parValArr:any[]=[
            {
                devParName: "motorPosition",
                value: motorOld
            },{
                devParName: "targetTemperature",
                value: targetT
            },{
                devParName: "PID",
                value: PID
            }
        ];

        

        if(Math.abs(targetT-measuredT) > 0.3){
            // heating
            if (measuredT < targetT) {
                if ((measuredT < lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }else if (targetT - measuredT > 0.8) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c*2,targetT,measuredT,motorRange);
                }
                
            // cooling
            }else {
                if ((measuredT > lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }else if (measuredT - targetT > 0.8) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c*2,targetT,measuredT,motorRange);
                }
                
            }
        }

        //Uncomment this line to enable PIDregulation
        //parValArr = this.PIDregulation(PID,motorOld,motorRange,targetT);

        return parValArr;
    }
}
