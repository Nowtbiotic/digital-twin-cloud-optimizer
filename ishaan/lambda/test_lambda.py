from .lambda_function import lambda_handler

event={
    "application":"CloudOptimizationDemo",
    "cpu_utilization":82,
    "workload":100,
    "response_time_ms":250,
    "instance_count":2
}

print(lambda_handler(event,None))