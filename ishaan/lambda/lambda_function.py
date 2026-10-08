import boto3
import json
from decimal import Decimal
from digital_twin.optimizer import OptimizationEngine

engine=OptimizationEngine()
table=boto3.resource("dynamodb",region_name="ap-south-1").Table("DigitalTwinState")

def clean_item(item):
    result={}
    for key,value in item.items():
        if isinstance(value,Decimal):
            result[key]=int(value) if value % 1 == 0 else float(value)
        else:
            result[key]=value
    return result

def response(status_code,body):
    return {
        "statusCode":status_code,
        "headers":{
            "Content-Type":"application/json",
            "Access-Control-Allow-Origin":"http://localhost:8000",
            "Access-Control-Allow-Headers":"Content-Type",
            "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
        },
        "body":json.dumps(body)
    }

def lambda_handler(event,context):
    method=event.get("httpMethod") or event.get("requestContext",{}).get("http",{}).get("method")

    if method=="OPTIONS":
        return response(200,{"message":"OK"})

    if method=="GET":
        result=table.get_item(
            Key={"application":event.get("application","CloudOptimizationDemo")}
        )
        item=result.get("Item")

        if not item:
            return response(404,{"message":"Digital Twin state not found"})

        return response(200,clean_item(item))

    if method=="POST":
        body=event.get("body",event)

        if isinstance(body,str):
            body=json.loads(body)

        twin=engine.optimize(
            body.get("application","CloudOptimizationDemo"),
            float(body["cpu_utilization"]),
            float(body["workload"]),
            float(body["response_time_ms"]),
            int(body["instance_count"])
        )

        item=twin.to_dict()

        table.put_item(Item={
            "application":item["application"],
            "instances":item["instances"],
            "cpu_utilization":Decimal(str(item["cpu_utilization"])),
            "workload":Decimal(str(item["workload"])),
            "response_time_ms":Decimal(str(item["response_time_ms"])),
            "status":item["status"],
            "recommended_instances":item["recommended_instances"],
            "decision":item["decision"],
            "timestamp":item["timestamp"]
        })

        return response(200,item)

    return response(405,{"message":"Method not allowed"})