export function renderChart(prices, canvasId = "priceChart") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    const tooltip = document.getElementById("chartTooltip");

    // Handle high DPI
    const ratio = window.devicePixelRatio || 1;
    const width = Math.floor(parent.clientWidth * ratio);
    const height = Math.floor(140 * ratio); // Fixed height

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = "140px";

    ctx.scale(ratio, ratio);

    // Virtual dimensions (CSS pixels)
    const vWidth = parent.clientWidth;
    const vHeight = 140;

    // Clear
    ctx.clearRect(0, 0, vWidth, vHeight);

    if (!prices || !prices.length) {
        drawEmptyState(ctx, vWidth, vHeight);
        return;
    }

    const values = prices.map(p => p.price);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Layout
    const paddingX = 10;
    const paddingY = 20;
    const chartWidth = vWidth - (paddingX * 2);
    const chartHeight = vHeight - (paddingY * 2);

    const range = max - min || 1;

    // Calculate points
    const points = values.map((val, i) => {
        const x = paddingX + (i * chartWidth / Math.max(1, values.length - 1));
        // If range is 0 (single price history), center it vertically
        const normalizedY = range === 0 ? 0.5 : (val - min) / range;
        const y = paddingY + chartHeight - (normalizedY * chartHeight);
        return { x, y, val, date: prices[i].date };
    });

    // Draw baseline
    drawBaseline(ctx, vWidth, vHeight);

    if (points.length === 1) {
        drawSinglePointState(ctx, points[0], vWidth, vHeight);
    } else {
        drawChart(ctx, points, vHeight);
    }

    // Interaction
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        // Find closest point
        let closest = null;
        let minDist = Infinity;

        points.forEach(p => {
            const dist = Math.abs(p.x - mouseX);
            if (dist < 20 && dist < minDist) { // 20px snap radius
                minDist = dist;
                closest = p;
            }
        });

        if (closest) {
            // Highlight point
            renderChart(prices, canvasId); // Redraw to clear previous highlights
            ctx.beginPath();
            ctx.arc(closest.x, closest.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#0071e3";
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();

            // Show tooltip
            if (tooltip) {
                const dateStr = new Date(closest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                tooltip.innerHTML = `<strong>${closest.val.toLocaleString()}</strong><br><span style="font-weight:400; color:#86868b">${dateStr}</span>`;
                tooltip.style.left = `${closest.x}px`;
                tooltip.style.top = `${closest.y - 10}px`;
                tooltip.classList.remove("hidden");
            }
        } else {
            // Reset if no point close
            if (tooltip && !tooltip.classList.contains("hidden")) {
                renderChart(prices, canvasId);
                tooltip.classList.add("hidden");
            }
        }
    };

    canvas.onmouseleave = () => {
        renderChart(prices, canvasId); // Redraw clean
        if (tooltip) tooltip.classList.add("hidden");
    };
}

function drawEmptyState(ctx, w, h) {
    ctx.fillStyle = "#86868b";
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No history yet", w / 2, h / 2);
}

function drawBaseline(ctx, w, h) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 1);
    ctx.lineTo(w, h - 1);
    ctx.stroke();
}

function drawSinglePointState(ctx, point, w, h) {
    // Draw dashed line across
    ctx.strokeStyle = "rgba(0, 113, 227, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, point.y);
    ctx.lineTo(w, point.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw pulsating dot
    ctx.beginPath();
    ctx.arc(w / 2, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#0071e3";
    ctx.fill();

    // Outer glow
    ctx.beginPath();
    ctx.arc(w / 2, point.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 113, 227, 0.2)";
    ctx.fill();

    // Text
    ctx.fillStyle = "#0071e3";
    ctx.textAlign = "center";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillText("Active Monitoring", w / 2, point.y - 15);
}

function drawChart(ctx, points, height) {
    // Gradient Fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 113, 227, 0.25)");
    gradient.addColorStop(1, "rgba(0, 113, 227, 0.0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
    });

    // Close path for fill
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.lineTo(points[0].x, height);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
    });
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0071e3";
    ctx.stroke();
}
