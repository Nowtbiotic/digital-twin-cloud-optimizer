from dataclasses import dataclass,asdict
from datetime import datetime,timezone

@dataclass
class DigitalTwin:
    application: str
    instances: int
    cpu_utilization: float
    workload: float
    response_time_ms: float
    status: str
    recommended_instances: int
    decision: str
    timestamp: str

    @classmethod
    def create(cls,application,instances,cpu_utilization,workload,response_time_ms,status,recommended_instances,decision):
        return cls(
            application=application,
            instances=instances,
            cpu_utilization=cpu_utilization,
            workload=workload,
            response_time_ms=response_time_ms,
            status=status,
            recommended_instances=recommended_instances,
            decision=decision,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    def to_dict(self):
        return asdict(self)