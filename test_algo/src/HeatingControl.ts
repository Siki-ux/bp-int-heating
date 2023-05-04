import * as data from "../index";

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

    calculateOutput(processVariable: number,time:number): number {

        console.log(processVariable);
        console.log(this.setpoint);
        console.log(this.kp);
        console.log(this.ki);
        console.log(this.kd);
        console.log(this.integral);
        console.log(this.prevError);
        console.log(this.startTime);
        console.log(time);
        console.log(this.outputLimits);



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

    
    private async updateLastValue(measuredT:number,motorPosition:number,trvID:number){
        console.log("\tUpdated 'lastMeasuredTemperature' to:" + measuredT);
        console.log("\tUpdated 'motorPosition' to:" + motorPosition);

        
    }

    private HeatingAlgo(MPold:number,c:number,Ttarget:number,Tmeasured:number,MR:number):number{
        
        let MPnew = Math.round(MPold-((c*(Ttarget-Tmeasured)*MR)/100));
        console.log("\t\tCalculating new MP:" +MPnew);

        if ( Math.abs(MPnew-MPold) < 17)
            return MPold;
        if ( MPnew >= MR)
            return MR;
        if ( MPnew < 0)
            return 0;
        return MPnew;
    }

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

    

    public HeatingControl():HeatingRet{
        let TRVs = data.TRVs;
        let d=[];
        console.log("starting HeatingControl\nFound "+TRVs.length+" TRVs");
        if (TRVs.length < 1) {
            return {
                status: 0,
                statusStr: 'Stoped HeatingControl!',
                data: null,
                error: "No devices to control",
            } as HeatingRet; 
        }
        for(var index in TRVs){
            
            let trvID = TRVs[index].id;
            if (typeof trvID === "undefined") continue;

            let systemID = TRVs[index].mnSystemId;
            if (typeof systemID === "undefined") continue;


            let groups = data.groups;
            if (groups.length < 1) continue;

            console.log("Checking TRV "+trvID+"; in System "+systemID)
            for(var jndex in groups){
                let groupID = groups[jndex].id;
                if (typeof groupID === "undefined") continue;
                let sensors = data.deviceList;
                if (sensors.length < 1) continue;
                console.log("\tChecking Group "+groupID+"; Group contains "+sensors.length+" tSens sensor/s")
                let total = 0.0;
                for(var zndex in sensors) {
                    let sensorID = sensors[zndex].id;
                    if (typeof sensorID === "undefined") continue;

                    let sensor = data.getDeviceParameterValueList(sensorID);
                    let temp = sensor[this.tSensTemperatureIndex].value;
                    if (typeof temp !== "number") continue;

                    total += temp;
                }
                
                let tSensMean;
                
                let trvParamList =  data.getDeviceTrvValueList();
                let trvMotorOld:number,trvMotorRange:number,trvTargetT:number,trvMeasuredT:number,trvLastMeasuredT:number,trvCoeficient:number,integral:number,prevError:number,startTime:number,currTime:number;
                
                try {
                    
                    trvMotorOld = Math.round(this.getNumericParam(trvParamList,"motorPosition",this.motorLowLimit,this.motorHighLimit));
                    
                    trvMotorRange = Math.round(this.getNumericParam(trvParamList,"motorRange",this.motorLowLimit,this.motorHighLimit));
                    trvTargetT = Math.round(this.getNumericParam(trvParamList,"targetTemperature",1,100)*100)/100;
                    trvMeasuredT = Math.round(this.getNumericParam(trvParamList,"sensorTemperature",-100,100)*100)/100;
                    trvLastMeasuredT = Math.round(this.getNumericParam(trvParamList,"lastMeasuredTemperature",-100,100)*100)/100;
                    trvCoeficient = Math.round(this.getNumericParam(trvParamList,"coeficient",this.coeficientLowLimit,this.coeficientHighLimit));
                    integral = this.getNumericParam(trvParamList,"integral",-100,100);
                    prevError = this.getNumericParam(trvParamList,"prevError",-100,100);
                    startTime = this.getNumericParam(trvParamList,"startTime",0,99999999999999);
                    currTime = this.getNumericParam(trvParamList,"currTime",0,99999999999999);
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

                if (sensors.length >= 1){
                    tSensMean = Math.round((total/sensors.length)*100)/100;
                }else {
                    console.log("\t***No tSens sensors found! tSens mean = TRV measured***");
                    tSensMean = trvMeasuredT;
                }


                console.log("\ttSens sensors mean temperature is "+tSensMean);
                console.log("\tTRV motor position is "+trvMotorOld);
                console.log("\tTRV motor range is "+trvMotorRange);
                console.log("\tTRV target temperature is "+trvTargetT);
                console.log("\tTRV measured temperature is "+trvMeasuredT);
                console.log("\tTRV (tSens) last measured temperature is "+trvLastMeasuredT);
                console.log("\tTRV coeficient is "+trvCoeficient);
                
                
                let trvNewMotorPositionArr = this.HeatingControlLogic(trvMotorOld,trvMotorRange,trvCoeficient,trvTargetT,tSensMean,trvLastMeasuredT,integral,prevError,startTime,currTime);
                d = trvNewMotorPositionArr;
                console.log("\tNew calculated motor position is "+trvNewMotorPositionArr[0].value);
                if (trvNewMotorPositionArr[0].value != trvMotorOld){
                    try {
                        console.log("\t\tLaunching command "+this.trvCMDsetMotorPositionID+" for "+trvID+" with MP: "+trvNewMotorPositionArr[0].value);
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
                try {
                    this.updateLastValue(tSensMean,trvNewMotorPositionArr[0].value,trvID);
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
            data: d,
            error: null
        } as HeatingRet;   
    }


    private HeatingControlLogic(motorOld:number,motorRange:number,c:number,targetT:number,measuredT:number,lastMeasuredT:number,integral:number,prevError:number,startTime:number,currTime:number):any[]{
        let pidController = new PIDController(targetT, 20, 1, 1, [0, 800],integral,prevError,startTime);
        
        let PID = Math.round(pidController.calculateOutput(measuredT,currTime));
        console.log(PID);
        /*
        let mpPID = 800-PID;

        if ( Math.abs(mpPID-motorOld) < 17) mpPID = motorOld;
        if ( mpPID >= motorRange) mpPID = motorRange;
        if ( mpPID < 0) mpPID = 0;
        
        let newMP = motorOld;
        if(Math.abs(targetT-measuredT) > 0.3){

            if (measuredT < targetT) {
                if (measuredT < lastMeasuredT){
                    newMP = mpPID;
                }else if (targetT-measuredT > 0.8){
                    newMP = mpPID;
                    if (motorOld == 0){
                        newMP = motorRange-motorRange/4;
                    }
                }
                    

            }else {
                if (measuredT > lastMeasuredT){
                    newMP = mpPID;
                }else if(measuredT-targetT > 0.8){
                    newMP = 0;
                } 
            }
        }*/


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

        //return  parValArr;
        
       
        if(Math.abs(targetT-measuredT) > 0.3){
            // heating
            if (measuredT < targetT) {
                if ((measuredT < lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }else if (targetT - measuredT > 1) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c*2,targetT,measuredT,motorRange);
                }
                
            // cooling
            }else {
                if ((measuredT > lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }else if (measuredT - targetT > 1) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c*2,targetT,measuredT,motorRange);
                }
                
            }
        }
        return parValArr;
    }
}
