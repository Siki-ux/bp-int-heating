//import { SqlDbCredentialsProvider } from "../../IotDataBase/db/SqlDbCommon/SqlDbCredentialProvider";
import { DeviceModelDbService } from "../../IotDataBase/db/deviceModelDb/src/DeviceModelDbService";
import * as apidev from "../../IotDataBase/api/deviceModel/deviceModelTypes";

export interface HeatingRet {
    status: number;
    statusStr: string;
    data: any;
    error: any;
  }

export class HeatingControl{

    private db: DeviceModelDbService;
    private trvModelId = 113;
    private tSensModelID = 2;
    private tSensTemperatureIndex = 17;
    private trvCMDsetMotorPositionID = 9;
    private trvCMDsetMotorPositionAndTargetID = 4;
    private motorLowLimit = 1;
    private motorHighLimit = 800;
    private coeficientHighLimit = 20;
    private coeficientLowLimit = 1;

    private criticalCooling = 2;

    //itemp_test

    constructor(devModelDbSrvc: DeviceModelDbService){
        this.db = devModelDbSrvc;
    }

    

    private async updateLastValue(measuredT:number,motorPosition:number,trvID:number){
        var parValArr: apidev.ParameterValue[] = [{
                "devParName": "lastMeasuredTemperature",
                "value": measuredT
            }];
        await this.db.putDeviceParameterValueList(trvID,parValArr);
        parValArr = [{
            "devParName":"motorPosition",
            "value": motorPosition
        }];
        await this.db.putDeviceParameterValueList(trvID,parValArr);
        
    }

    private HeatingAlgo(MPold:number,c:number,Ttarget:number,Tmeasured:number,MR:number):number{
        let MPnew = MPold-((c*(Ttarget-Tmeasured)*MR)/100);
        if ( Math.abs(MPnew-MPold) < 17 || MPnew > MR || MPnew < 0)
            return MPold;
        return Math.round(MPnew);
    }

    private getNumericParam(trvParamList:apidev.ParameterValue[],paramName:string,lowLimit:number,highLimit:number):number{
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

    

    public async HeatingControl():Promise<HeatingRet>{
        let TRVs = await this.db.getDeviceList(null,this.trvModelId,null,null);
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


            let groups = await this.db.getGroupList(systemID,null,trvID);
            if (groups.length < 1) continue;

            console.log("Checking TRV "+trvID+"; in System "+systemID)
            for(var jndex in groups){
                let groupID = groups[jndex].id;
                if (typeof groupID === "undefined") continue;
                let sensors = await this.db.getDeviceList(systemID,this.tSensModelID,groupID);
                if (sensors.length < 1) continue;
                console.log("\tChecking Group "+groupID+"; Group contains "+sensors.length+" tSens sensor/s")
                let total = 0.0;
                for(var zndex in sensors) {
                    let sensorID = sensors[zndex].id;
                    if (typeof sensorID === "undefined") continue;

                    let sensor = await this.db.getDeviceParameterValueList(sensorID,null,"parameter");
                    let temp = sensor[this.tSensTemperatureIndex].value;
                    if (typeof temp !== "number") continue;

                    total += temp;
                }
                
                let tSensMean;
                
                let trvParamList =  await this.db.getDeviceParameterValueList(trvID,null,"parameter");
                let trvMotorOld:number,trvMotorRange:number,trvTargetT:number,trvMeasuredT:number,trvLastMeasuredT:number,trvCoeficient:number;

                try {
                    trvMotorOld = this.getNumericParam(trvParamList,"motorPosition",this.motorLowLimit,this.motorHighLimit);
                    trvMotorRange = this.getNumericParam(trvParamList,"motorRange",this.motorLowLimit,this.motorHighLimit);
                    trvTargetT = this.getNumericParam(trvParamList,"targetTemperature",1,100);
                    trvMeasuredT = this.getNumericParam(trvParamList,"sensorTemperature",-100,100);
                    trvLastMeasuredT = this.getNumericParam(trvParamList,"lastMeasuredTemperature",-100,100);
                    trvCoeficient=this.getNumericParam(trvParamList,"coeficient",this.coeficientLowLimit,this.coeficientHighLimit);
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
                    tSensMean = total/sensors.length;
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
                
                
                let trvNewMotorPositionArr = this.HeatingControlLogic(trvMotorOld,trvMotorRange,trvCoeficient,trvTargetT,tSensMean,trvLastMeasuredT);

                console.log("\tNew calculated motor position is "+trvNewMotorPositionArr[0].value);
                if (trvNewMotorPositionArr[0].value != trvMotorOld){
                    try {
                        console.log("\tLaunching command "+this.trvCMDsetMotorPositionID+" for "+trvID+" with data:");
                        console.log(trvNewMotorPositionArr);
                        await this.db.putLaunchCmdDevice(trvID,this.trvCMDsetMotorPositionAndTargetID,trvNewMotorPositionArr,"HeatingControl");
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
                    await this.updateLastValue(tSensMean,trvNewMotorPositionArr[0].value,trvID);
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
            data: null,
            error: null
        } as HeatingRet;   
    }


    private HeatingControlLogic(motorOld:number,motorRange:number,c:number,targetT:number,measuredT:number,lastMeasuredT:number):apidev.ParameterValue[]{

        let parValArr:apidev.ParameterValue[]=[
            {
                devParName: "motorPosition",
                value: motorOld  
            },{
                devParName: "targetTemperature",
                value: targetT
            }
        ];
        if(Math.abs(targetT-measuredT) >= 0.2){
            if (measuredT < targetT) {
                if (measuredT < lastMeasuredT) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }
                //critical heating
                if (targetT - measuredT > this.criticalCooling){
                    if (c <= 10){
                        c = 1.5*c;
                    }
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }
            }else {
                if (measuredT > lastMeasuredT) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }
                //critical cooling
                if (measuredT - targetT > this.criticalCooling){
                    parValArr[0].value = motorRange;
                }
            }
        }
        return parValArr;
    }
}
