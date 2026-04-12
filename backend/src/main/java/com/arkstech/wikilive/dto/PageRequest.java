package com.arkstech.wikilive.dto;

import lombok.Data;

import lombok.NoArgsConstructor;


//объект для ПЕРЕДАЧИ данных между фронтом и бэкендом

@Data
@NoArgsConstructor
public class PageRequest {
    private String title;
    private String content;     //JSON
    private String mwsTableId;  //таблица из МТС
}
