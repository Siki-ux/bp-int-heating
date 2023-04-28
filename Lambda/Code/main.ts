import { APIGatewayProxyHandler } from 'aws-lambda';

//BND
//import { HeatingControlService, HeatingControl } from '../../../src/heatingControl/heatingControlService';
import { HeatingControl } from '../../../src/heatingControl/HeatingControl';

//BND
import { IotDbGwService } from '../../../src/iotDbGwService';

//API
import { getConnection } from '../../../aws_api/common/ts/src/lambdaHelpers';
import { DeviceModelDbService } from "../../../IotDataBase/db/deviceModelDb/src/DeviceModelDbService";
import { KpiDbService } from "../../../IotDataBase/db/kpi/src/KpiDbService";
import { AdminDbService } from "../../../IotDataBase/db/admin/src/AdminDbService";
//import { DbService } from '../../../IotDataBase/lgmcOrmDbApi/src/DbService';

const devModelDbSrvc: DeviceModelDbService  = new DeviceModelDbService ();
const kpiDbSrvc: KpiDbService  = new KpiDbService ();
const adminDbService: AdminDbService  = new AdminDbService ();
//const dbService: DbService  = new DbService ();
//const lersenSrvc: LersenControlService = new LersenControlService();

export const handler: APIGatewayProxyHandler = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false

  let resCode = 200;

  const json = JSON.parse(JSON.stringify(event));

  const connectionName = json.connName;

  await getConnection(devModelDbSrvc, connectionName);
  await getConnection(kpiDbSrvc, connectionName);
  await getConnection(adminDbService, connectionName);
  //await getConnection(dbService, connectionName);
/*
  const req: HeatingControl = json as HeatingControl;

  const heatingSrvc: HeatingControlService = new HeatingControlService(connectionName, devModelDbSrvc, kpiDbSrvc, adminDbService);

  const ret  = await heatingSrvc.HeatingControl(req);*/
  let req = new HeatingControl(devModelDbSrvc);
  let ret = await req.HeatingControl();
  //console.log('apiAwsLambda.lersenControl returns: ' + JSON.stringify(ret, null, 0));

  if (ret.status != 0) {    
    resCode = 400;
  }   

  return {
    statusCode: resCode,
    body: JSON.stringify(ret)
  };
}
