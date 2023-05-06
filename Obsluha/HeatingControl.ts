/***
 * @author: xsikul@stud.fit.vutbr.cz, Jakub Sikula
 * This script contains whole heating service.
 */
import { DeviceModelDbService } from "../../IotDataBase/db/deviceModelDb/src/DeviceModelDbService";
import * as apidev from "../../IotDataBase/api/deviceModel/deviceModelTypes";

//enable console output
let consoleEN = 1;

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
    private criticalT = 0.9;

    constructor(devModelDbSrvc: DeviceModelDbService){
        this.db = devModelDbSrvc;
    }

    
    /**Function which update values in database entry of TRV.*/
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

    /**Function which calculate proportional regulation.
     * @returns new calculated motor position
    */
    private HeatingAlgo(MPold:number,c:number,Ttarget:number,Tmeasured:number,MR:number):number{
        let MPnew = Math.round(MPold-((c*(Ttarget-Tmeasured)*MR)/100));
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

    /**Function which cycle through all sensors in group to calculate mean temperature in room. If none are present uses TRV temp
     * @returns room temperature
    */
    private async getRoomTemp(trvMeasuredT:number,systemID:number,groupID:number):Promise<number>{
        let sensors = await this.db.getDeviceList(systemID,this.tSensModelID,groupID);
        let roomTemp;
        if(consoleEN)console.log("\tGroup contains "+sensors.length+" tSens sensor/s")
        if (sensors.length >= 1){
            let total = 0.0;
            for(var zndex in sensors) {
                let sensorID = sensors[zndex].id;
                if (typeof sensorID === "undefined") continue;

                let sensor = await this.db.getDeviceParameterValueList(sensorID,null,"parameter");
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
    public async HeatingControl():Promise<HeatingRet>{
        let TRVs = await this.db.getDeviceList(null,this.trvModelId,null,null);
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


            let groups = await this.db.getGroupList(systemID,null,trvID);
            if (groups.length < 1) continue;

            if(consoleEN)console.log("Checking TRV "+trvID+"; in System "+systemID);
            //Cycle through all groups (rooms) in which is device located. Skip groups with incorrect data
            for(var jndex in groups){
                let groupID = groups[jndex].id;
                if (typeof groupID === "undefined") continue;
                if(consoleEN)console.log("\tChecking Group "+groupID);                

                //Try to get all requierd data from database or FIAL control
                let trvParamList =  await this.db.getDeviceParameterValueList(trvID,null,"parameter");
                let trvMotorOld:number,trvMotorRange:number,trvTargetT:number,trvMeasuredT:number,trvLastMeasuredT:number,trvCoeficient:number,roomTemp:number;
                try {
                    trvMotorOld = Math.round(this.getNumericParam(trvParamList,"motorPosition",this.motorLowLimit,this.motorHighLimit));
                    trvMotorRange = Math.round(this.getNumericParam(trvParamList,"motorRange",this.motorLowLimit,this.motorHighLimit));
                    trvTargetT = Math.round(this.getNumericParam(trvParamList,"targetTemperature",1,100)*100)/100;
                    trvMeasuredT = Math.round(this.getNumericParam(trvParamList,"sensorTemperature",-100,100)*100)/100;
                    trvLastMeasuredT = Math.round(this.getNumericParam(trvParamList,"lastMeasuredTemperature",-100,100)*100)/100;
                    trvCoeficient = Math.round(this.getNumericParam(trvParamList,"coeficient",this.coeficientLowLimit,this.coeficientHighLimit));
                    roomTemp = await this.getRoomTemp(trvMeasuredT,systemID,groupID);
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
                let trvNewMotorPositionArr = this.HeatingControlLogic(trvMotorOld,trvMotorRange,trvCoeficient,trvTargetT,roomTemp,trvLastMeasuredT);
                let newMotorPosition:number=0;
                if (typeof trvNewMotorPositionArr[0].value === "number")newMotorPosition = trvNewMotorPositionArr[0].value;
                if(consoleEN)console.log("\tNew calculated motor position is "+newMotorPosition);

                //If change is required, try to launch new command. Not needed in simulation 
                if (trvNewMotorPositionArr[0].value != trvMotorOld){
                    try {
                        if(consoleEN)console.log("\t\tLaunching command "+this.trvCMDsetMotorPositionID+" for "+trvID+" with MP: "+trvNewMotorPositionArr[0].value);
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

                //Try to update database
                try {
                    await this.updateLastValue(roomTemp,newMotorPosition,trvID);
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

     /**Function which runs heating algorithm and formats output
     * @returns Array containg result data
     */
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

        if(Math.abs(targetT-measuredT) > 0.3){
            // heating
            if (measuredT < targetT) {
                if ((measuredT < lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }else if (targetT - measuredT > this.criticalT) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c*2,targetT,measuredT,motorRange);
                }
                
            // cooling
            }else {
                if ((measuredT > lastMeasuredT) && (Math.abs(lastMeasuredT - measuredT) <= 0.1)) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c,targetT,measuredT,motorRange);
                }else if (measuredT - targetT > this.criticalT) {
                    parValArr[0].value = this.HeatingAlgo(motorOld,c*2,targetT,measuredT,motorRange);
                }            
            }
        }
        return parValArr;
    }
}
