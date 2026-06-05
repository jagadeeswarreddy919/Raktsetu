package com.onedrop.analytics.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private int processedQueuedJobs = 1420;
    private int generatedReportsCount = 385;

    // Simulate background log consolidation every 15 seconds
    @Scheduled(fixedRate = 15000)
    public void consolidateSystemLogs() {
        processedQueuedJobs += (int) (Math.random() * 5);
        if (Math.random() > 0.8) {
            generatedReportsCount++;
        }
        System.out.println("[Java Service] Background consolidated system logs. Reports Generated: " + generatedReportsCount + ", Queue Jobs Processed: " + processedQueuedJobs);
    }

    public Map<String, Object> getSystemUtilizationSummary() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("processedQueueJobs", processedQueuedJobs);
        metrics.put("generatedReportsCount", generatedReportsCount);
        metrics.put("queueStatus", "HEALTHY");
        metrics.put("kafkaClusterStatus", "CONNECTED");
        metrics.put("averageProcessingLatencyMs", 42.5);
        return metrics;
    }

    public List<Map<String, Object>> getMonthlyDistribution() {
        List<Map<String, Object>> monthlyData = new ArrayList<>();
        
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        int[] donations = {350, 420, 510, 480, 620, 710};
        int[] demands = {400, 410, 480, 520, 590, 750};

        for (int i = 0; i < months.length; i++) {
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("month", months[i]);
            dataPoint.put("donations", donations[i]);
            dataPoint.put("demand", demands[i]);
            monthlyData.add(dataPoint);
        }
        return monthlyData;
    }
}
