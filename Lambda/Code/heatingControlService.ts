
//BND
import { IotDbDeviceMappService }  from '../iotDbDeviceMappService';
import {InfluxDbApiService} from "../influxDbApiService";
import { IotService } from '../IotService';
import {AbstractIotService} from "../AbstractIotService";
//API
import { DeviceModelDbService } from "../../IotDataBase/db/deviceModelDb/src/DeviceModelDbService";
import { KpiDbService } from "../../IotDataBase/db/kpi/src/KpiDbService";
import { AdminDbService } from "../../IotDataBase/db/admin/src/AdminDbService";

import { 
    MnDeviceGroup,
    //MnSuperGroup,
    MnDevice,
    ParameterGetVerbosity,
    GroupParameter,
    ParameterValue,
    MnCmd
 } from "../../IotDataBase/api/deviceModel/deviceModelTypes";

 import { 
   // MnEnterprise,
    MnSystem,
 } from "../../IotDataBase/api/admin/adminTypes";

export interface HeatingControl {
    connName: string;

}

export interface HeatingRet {
    /**
     * 0: OK, <0: Error
     */
    status: number;
    /**
     * Status description
     */
    statusStr: string;
    data: any;
    error: any;
  }

export class HeatingControlService {

    private readonly connectionName: string;
    private devModelService: DeviceModelDbService;
    private kpiDbService: KpiDbService;
    private adminDbService:AdminDbService;
    public dbDevMapSrvc: IotDbDeviceMappService = new IotDbDeviceMappService();
    private influxService: InfluxDbApiService;
    public iotSrvc: AbstractIotService;

    ctr_enable_name = 'ctr_enable';
    ctr_master_temp_name = 'ctr_master_temp';
    ctr_last_temp_st3_name = 'ctr_last_temp_st3';
    ctr_last_downlink_name = 'ctr_last_downlink';
    ctr_parcel_sent_name = 'ctr_parcel_sent';
    ctr_zone_method_name = 'ctr_zone_method';
    temp_st3_name = 'temp_st3';
    deviceModelId = 1;

    constructor(connectionName: string, devModelService: DeviceModelDbService, kpiDbService: KpiDbService,
        adminDbService: AdminDbService, iotService?: AbstractIotService,
        influxService?: InfluxDbApiService) {

        this.connectionName = connectionName;
        this.devModelService = devModelService;
        this.kpiDbService = kpiDbService;
        this.adminDbService = adminDbService;
        this.iotSrvc = iotService ?? new IotService();
        this.influxService = influxService ?? new InfluxDbApiService();
    }

    public async HeatingControl(req: HeatingControl): Promise<HeatingRet> {

        //Get All Systems...
        let systems: MnSystem[] = [];        
        try {
            systems = await this.adminDbService.getSystemList(null, null);        

        } catch(e) {
            console.log('Exception admin: ' + e);
            return {
                status: -1,
                statusStr: 'HeatingControl:getSystemList:exception: ' + e,
                data: null,
                error: e
            } as HeatingRet; 
        }

        //console.log('Systems: ' + JSON.stringify(systems, null, 1));

        for(const sys of systems) {
            await this.HeatingControlSystem(req, sys);
        }
    
        return {
            status: 0,
            statusStr: 'OK Heating!',
            data: null,
            error: null
        } as HeatingRet;    

    }

    public async HeatingControlSystem(req: HeatingControl, system: MnSystem): Promise<HeatingRet> {

        //Get All groups...
        let groups: MnDeviceGroup[] = [];        
        try {
            groups = await this.devModelService.getGroupList(system.id);        

        } catch(e) {
            console.log('Exception admin: ' + e);
            return {
                status: 0,
                statusStr: 'Exception!' + e,
                data: null,
                error: e
            } as HeatingRet;   
        }

        for (const gr of groups) {
            await this.HeatingControlGroup(req, system, gr);
        }

        console.log('Groups num: ' + groups.length);

        return {
            status: 0,
            statusStr: 'OK Lersen!',
            data: null,
            error: null
        } as HeatingRet;   

    }

    public async HeatingControlGroup(req: HeatingControl, system: MnSystem, group: MnDeviceGroup): Promise<HeatingRet> {

        //console.log('Group>>: ' + JSON.stringify(group, null, 1));

        //Get All Devices...
        let devices: MnDevice[] = [];        
        try {
            const verb: ParameterGetVerbosity = 'parameterTypeEnums';
            devices = await this.devModelService.getDeviceList(system.id, this.deviceModelId, group.id,
                [], verb);        

        } catch(e) {
            return {
                status: 0,
                statusStr: 'No devices',
                data: null,
                error: null
            } as HeatingRet;   
        }

        //console.log('Devices>>: ' + JSON.stringify(devices, null, 1));

        await this.HeatingControlDevices(req, group, devices);
        
        return {
            status: 0,
            statusStr: 'OK Lersen!',
            data: null,
            error: null
        } as HeatingRet;   

    }
    

    
    public async HeatingControlDevices(req: HeatingControl, group: MnDeviceGroup, devices: MnDevice[]): Promise<HeatingRet> {

        // Do something with devices
        for(const dev of devices) {
            const some_paramter = this.GetParameterValueNum(this.GetParameterValue('some parameter name', dev.parameterValues)); //this.mnDevSrvc.GetParameterValue(ht, 'ctr_master_temp');

            let topic;
            let msg;

            let lnsType = 'ttn';

            // Lora topic construction...
            if (dev.mqttTopic) {
                if (dev.mqttTopic.indexOf('lgmcChirpstack') != -1) {
                    lnsType = 'Chirpstack';
                } else {
                    lnsType = 'ttn';
                }
            }

            if (lnsType === 'Chirpstack') {
                //Chirpstack
                const topicParts = dev.mqttTopic.split('/');

                topic = topicParts[0] + '/' + topicParts[1] + '/' + topicParts[2] + '/' + topicParts[3] + '/' + dev.deviceUid + '/command/down'; 

                msg = {                    
                    //confirmed: false,
                    devEUI: dev.deviceUid,
                    fPort: 10,
                    fCnt: 2,
                    object: {
                        devType: 'whatever',
                        devUid: dev.deviceUid,
                        cmdName: 'some command',
                        cmdPars: {
                            somePar: 20
                        }
                    }
                    //reference:"qwer" 
                };

            } else {
                // TTN
                topic = 'lorawan/downlink';

                msg = {
                    thingName: dev.deviceUid,
                    payload: {

                    }       
                };
            }
    
            /**
             * MQTT messaging...
             */
            console.log('MQTT topis: ' + topic);
            console.log('MQTT msg: ' + JSON.stringify(msg, null, 1));
            
            await this.iotSrvc.sendMqttMsg3('a2ime1u7mj2qog-ats.iot.us-east-1.amazonaws.com', topic, msg);    
        }     

        return {
            status: 0,
            statusStr: 'OK Lersen!',
            data: null,
            error: null
        } as HeatingRet;   

    }   

        

    public async delay(ms: number) {
        await new Promise(resolve => setTimeout(()=>resolve(1), ms)).then(()=>console.log("fired"));
    }    

    public async GetGroupParameter(grpId: number, devParName: string): Promise<GroupParameter> {

        try {                
            const pv: ParameterGetVerbosity = 'parameterTypeEnums';
            const params: GroupParameter[] = await this.devModelService.getGroupParameterList(grpId, pv); 
        
            for (const par of params) {
                if (par.parameterValue?.mnParameter?.devParName === devParName) {
                    return par;
                }
            }           

        } catch(e) {
            console.log('Exception admin: ' + e);
        }

        return undefined;
    }

    GetParameterValue(devParName: string, parValues: ParameterValue[]): ParameterValue {
        for (const pv of parValues) {
            if (pv.devParName === devParName) {
                return pv;
            }
        }

        return undefined;
    }

    GetParameterValueNum(ParameterValue): number {
 
        if (ParameterValue?.mnParameter?.mnParameterType?.dataType == 'number') {
            return ParameterValue?.value;
        }

        return undefined;
    }    

    GetCommand(cmdModelName: string, cmds: MnCmd[]): MnCmd {
        for (const cmd of cmds) {
            if (cmd.cmdModelName === cmdModelName) {
                return cmd;
            }
        }

        return undefined;
    }    


};
