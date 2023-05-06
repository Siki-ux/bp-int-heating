//BND
import { HeatingControl } from '../../../src/heatingControl/HeatingControl';
//API
import { getConnection } from '../../../aws_api/common/ts/src/lambdaHelpers';
import { DeviceModelDbService } from "../../../IotDataBase/db/deviceModelDb/src/DeviceModelDbService";
import { KpiDbService } from "../../../IotDataBase/db/kpi/src/KpiDbService";
import { AdminDbService } from "../../../IotDataBase/db/admin/src/AdminDbService";
import { APIGatewayProxyHandler } from 'aws-lambda';

const devModelDbSrvc: DeviceModelDbService  = new DeviceModelDbService ();
const kpiDbSrvc: KpiDbService  = new KpiDbService ();
const adminDbService: AdminDbService  = new AdminDbService ();

export const handler: APIGatewayProxyHandler = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false

  let resCode = 200;

  const json = JSON.parse(JSON.stringify(event));

  const connectionName = json.connName;

  await getConnection(devModelDbSrvc, connectionName);
  await getConnection(kpiDbSrvc, connectionName);
  await getConnection(adminDbService, connectionName);
  let req = new HeatingControl(devModelDbSrvc);
  let ret = await req.HeatingControl();
  if (ret.status != 0) {    
    resCode = 400;
  }   

  return {
    statusCode: resCode,
    body: JSON.stringify(ret)
  };
}
