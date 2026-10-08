from ishaan.digital_twin.model import DigitalTwin

class OptimizationEngine:
    def __init__(self,min_instances=1,max_instances=10):
        self.min_instances=min_instances
        self.max_instances=max_instances

    def optimize(self,application,cpu_utilization,workload,response_time_ms,instances):
        if cpu_utilization>70 or response_time_ms>200:
            recommended_instances=min(instances+1,self.max_instances)
            decision="SCALE_OUT"
            status="UNDER-PROVISIONED"
        elif cpu_utilization<30 and response_time_ms<150:
            recommended_instances=max(instances-1,self.min_instances)
            decision="SCALE_IN"
            status="OVER-PROVISIONED"
        else:
            recommended_instances=instances
            decision="MAINTAIN"
            status="OPTIMAL"

        return DigitalTwin.create(
            application,
            instances,
            cpu_utilization,
            workload,
            response_time_ms,
            status,
            recommended_instances,
            decision
        )