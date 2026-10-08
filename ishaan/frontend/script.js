const API_URL="https://pnq99qlmi1.execute-api.ap-south-1.amazonaws.com/twin";

async function loadTwin(){
    try{
        const response=await fetch(API_URL);
        if(!response.ok)
            throw new Error("API request failed");
        const data=await response.json();

        document.getElementById("cpu").textContent=`${data.cpu_utilization}%`;
        document.getElementById("workload").textContent=`${data.workload} req/s`;
        document.getElementById("response").textContent=`${data.response_time_ms} ms`;
        document.getElementById("instances").textContent=data.instances;
        document.getElementById("status").textContent=data.status;
        document.getElementById("recommended").textContent=data.recommended_instances;
        document.getElementById("decision").textContent=data.decision;

        let history=JSON.parse(localStorage.getItem("twinHistory")||"[]");
        const latest=history[0];

        if(!latest||latest.timestamp!==data.timestamp){
            history.unshift(data);
            history=history.slice(0,10);
            localStorage.setItem("twinHistory",JSON.stringify(history));
        }

        renderHistory(history);
    }catch(error){
        console.error(error);
        document.getElementById("status").textContent="API ERROR";
    }
}

function renderHistory(history){
    const table=document.getElementById("history");
    table.innerHTML=history.map(item=>`
        <tr>
            <td>${item.cpu_utilization}%</td>
            <td>${item.workload} req/s</td>
            <td>${item.instances}</td>
            <td>${item.status}</td>
            <td>${item.decision}</td>
        </tr>
    `).join("");
}

loadTwin();
setInterval(loadTwin,10000);