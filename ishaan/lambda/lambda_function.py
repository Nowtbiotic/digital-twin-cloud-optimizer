from ishaan.digital_twin.optimizer import OptimizationEngine

engine=OptimizationEngine()

def lambda_handler(event,context):
    twin=engine.optimize(
        event.get("application","CloudOptimizationDemo"),
        float(event["cpu_utilization"]),
        float(event["workload"]),
        float(event["response_time_ms"]),
        int(event["instance_count"])
    )
    return {
        "statusCode":200,
        "body":twin.to_dict()
    }