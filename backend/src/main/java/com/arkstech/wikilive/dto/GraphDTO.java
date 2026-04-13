package com.arkstech.wikilive.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class GraphDTO {

    private List<NodeDTO> nodes;
    private List<EdgeDTO> edges;

    @Data
    @AllArgsConstructor
    public static class NodeDTO {
        private String slug;
        private String title;
    }

    @Data
    @AllArgsConstructor
    public static class EdgeDTO {
        private String from;
        private String to;
    }
}
