package com.onedrop.analytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AnalyticsApplication {
    public static void main(String[] args) {
        SpringApplication.run(AnalyticsApplication.class, args);
        System.out.println("==================================================");
        System.out.println(" ONEDROP SPRING BOOT ANALYTICS SERVICE ACTIVE ");
        System.out.println(" Running on port 8080");
        System.out.println("==================================================");
    }
}
