from .lambda_function import lambda_handler

event={
    "httpMethod":"GET",
    "application":"CloudOptimizationDemo"
}

print(lambda_handler(event,None))