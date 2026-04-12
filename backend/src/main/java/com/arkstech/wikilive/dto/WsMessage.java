package com.arkstech.wikilive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WsMessage {
    private String type; // "UPDATE", "PRESENCE", "CURSOR"
    private String slug;
    private String payload; // JSON-строка с данными
    private String sender;  // логин/ключ пользователя
}