package com.onedrop.analytics.controller;

import com.onedrop.analytics.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/system-summary")
    public Map<String, Object> getSystemSummary() {
        return analyticsService.getSystemUtilizationSummary();
    }

    @GetMapping("/monthly-distribution")
    public List<Map<String, Object>> getMonthlyDistribution() {
        return analyticsService.getMonthlyDistribution();
    }

    @GetMapping("/health")
    public Map<String, String> getHealth() {
        return Map.of(
            "status", "UP",
            "microservice", "ONEDROP Java Analytics Service"
        );
    }
}
