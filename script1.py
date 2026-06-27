"""
NeuroGraph MVP

A self-contained prototype of an AI-powered neuroscience knowledge graph.

The real product described in the proposal would use PDF parsers, biomedical
NER models, relation extraction models, Neo4j, vector search, and a web UI.
This script keeps the same architecture but implements a runnable MVP with:

- paper metadata
- section/sentence ingestion
- dictionary-based neuroscience entity recognition
- rule-based relation extraction
- evidence-linked graph edges
- confidence and conflict scoring
- natural-language search
- text export for a graph-style view

Run:
    python script1.py
    python script1.py search "retinal ganglion cells glutamate"
    python script1.py node "LGN"
    python script1.py explain "fear memories"
    python script1.py path "Retinal Ganglion Cells" "Primary Visual Cortex"
    python script1.py conflicts
    python script1.py export neurograph.json
    python script1.py interactive
    python script1.py timeline 2020
"""

from __future__ import annotations

import argparse
import json
import math
import re
import textwrap
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


# ---------------------------------------------------------------------------
# Domain vocabulary
# ---------------------------------------------------------------------------

ENTITY_VOCAB = {
    "brain_region": {
        "Amygdala": ["amygdala", "basolateral amygdala", "BLA"],
        "Hippocampus": ["hippocampus", "ventral hippocampus", "vHPC"],
        "Prefrontal Cortex": ["prefrontal cortex", "PFC", "medial prefrontal cortex"],
        "Retina": ["retina"],
        "Retinal Ganglion Cells": ["retinal ganglion cells", "RGCs", "RGC"],
        "Optic Nerve": ["optic nerve"],
        "LGN": ["LGN", "lateral geniculate nucleus"],
        "Primary Visual Cortex": ["primary visual cortex", "V1"],
        "Superior Colliculus": ["superior colliculus"],
        "Motor Cortex": ["primary motor cortex", "motor cortex", "M1"],
        "Dorsolateral Striatum": ["dorsolateral striatum", "DLS"],
        "VTA": ["ventral tegmental area", "VTA"],
        "SNc": ["substantia nigra pars compacta", "SNc"],
    },
    "cell_type": {
        "Layer V Pyramidal Neurons": ["layer V pyramidal neurons", "layer 5 pyramidal neurons"],
        "PV Neurons": ["PV neurons", "parvalbumin neurons"],
        "SST Neurons": ["SST neurons", "somatostatin neurons"],
        "VIP Neurons": ["VIP neurons"],
        "Bipolar Cells": ["bipolar cells"],
        "Astrocytes": ["astrocytes"],
        "Microglia": ["microglia"],
    },
    "neurotransmitter": {
        "Glutamate": ["glutamate", "glutamatergic", "excitatory"],
        "GABA": ["GABA", "GABAergic", "inhibitory"],
        "Dopamine": ["dopamine", "dopaminergic"],
        "Acetylcholine": ["acetylcholine", "cholinergic"],
        "Serotonin": ["serotonin", "serotonergic"],
        "Glycine": ["glycine", "glycinergic"],
    },
    "method": {
        "Anterograde Viral Tracing": ["anterograde viral tracing", "anterograde tracing"],
        "Retrograde Tracing": ["retrograde tracing"],
        "Optogenetics": ["optogenetics", "optogenetic"],
        "Patch Clamp": ["patch clamp", "whole-cell recording"],
        "Calcium Imaging": ["calcium imaging"],
        "Electron Microscopy": ["electron microscopy", "EM"],
        "fMRI": ["fMRI"],
        "DTI": ["DTI", "diffusion tensor imaging"],
        "Single-cell RNA-seq": ["single-cell RNA sequencing", "single-cell RNA-seq", "scRNA-seq"],
        "FISH": ["FISH"],
    },
    "species": {
        "Mouse": ["mouse", "mice", "C57BL/6"],
        "Rat": ["rat", "rats"],
        "Human": ["human", "humans"],
        "Marmoset": ["marmoset"],
        "Zebrafish": ["zebrafish"],
        "Fruit Fly": ["fruit fly", "Drosophila"],
        "Non-human Primate": ["non-human primate", "macaque"],
    },
    "disease": {
        "Parkinson's Disease": ["Parkinson", "Parkinson's disease"],
        "Alzheimer's Disease": ["Alzheimer", "Alzheimer's disease"],
        "Retinal Degeneration": ["retinal degeneration", "ganglion cell degeneration"],
    },
}


RELATION_RULES = [
    ("Projects To", ["project", "projects", "projection", "projections", "axons to"]),
    ("Activates", ["activate", "activates", "drives", "excites", "increases activity"]),
    ("Inhibits", ["inhibit", "inhibits", "suppresses", "reduces activity"]),
    ("Connected By", ["connected to", "connects to", "pathway to"]),
    ("Expresses", ["express", "expresses", "expression of"]),
    ("Damaged In", ["damaged in", "degenerates in", "lost in", "affected in"]),
]


METHOD_WEIGHTS = {
    "Electron Microscopy": 0.97,
    "Anterograde Viral Tracing": 0.92,
    "Retrograde Tracing": 0.90,
    "Optogenetics": 0.88,
    "Patch Clamp": 0.86,
    "Calcium Imaging": 0.80,
    "Single-cell RNA-seq": 0.76,
    "FISH": 0.72,
    "DTI": 0.64,
    "fMRI": 0.58,
}


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Paper:
    doi: str
    title: str
    authors: tuple[str, ...]
    year: int
    journal: str
    species_hint: str
    keywords: tuple[str, ...]


@dataclass(frozen=True)
class Evidence:
    paper: Paper
    sentence: str
    method: str | None
    species: str | None
    figure: str | None = None
    polarity: str = "support"  # support or contradict


@dataclass
class Node:
    name: str
    kind: str
    aliases: set[str] = field(default_factory=set)


@dataclass
class Edge:
    source: str
    target: str
    relation: str
    connection_type: str = "Unknown"
    evidence: list[Evidence] = field(default_factory=list)
    confidence: float = 0.0

    @property
    def support_count(self) -> int:
        return sum(1 for item in self.evidence if item.polarity == "support")

    @property
    def contradiction_count(self) -> int:
        return sum(1 for item in self.evidence if item.polarity == "contradict")


@dataclass(frozen=True)
class Extraction:
    source: str
    target: str
    relation: str
    connection_type: str
    evidence: Evidence


# ---------------------------------------------------------------------------
# NLP-ish extraction layer
# ---------------------------------------------------------------------------

class NeuroExtractor:
    """Small rule-based stand-in for the proposed biomedical NLP pipeline."""

    def __init__(self, vocab: dict[str, dict[str, list[str]]]):
        self.alias_index: list[tuple[str, str, str, re.Pattern[str]]] = []
        for kind, names in vocab.items():
            for canonical, aliases in names.items():
                for alias in aliases + [canonical]:
                    pattern = re.compile(rf"\b{re.escape(alias)}\b", re.IGNORECASE)
                    self.alias_index.append((canonical, kind, alias, pattern))

    def split_sentences(self, text: str) -> list[str]:
        chunks = re.split(r"(?<=[.!?])\s+", text.strip())
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    def detect_entities(self, sentence: str) -> dict[str, list[str]]:
        found: dict[str, list[str]] = defaultdict(list)
        seen: set[tuple[str, str]] = set()

        for canonical, kind, _alias, pattern in self.alias_index:
            if pattern.search(sentence) and (kind, canonical) not in seen:
                found[kind].append(canonical)
                seen.add((kind, canonical))

        return dict(found)

    def detect_relation(self, sentence: str) -> str | None:
        lowered = sentence.lower()
        for relation, triggers in RELATION_RULES:
            if any(trigger in lowered for trigger in triggers):
                return relation
        return None

    def detect_connection_type(self, entities: dict[str, list[str]], sentence: str) -> str:
        lowered = sentence.lower()
        neurotransmitters = set(entities.get("neurotransmitter", []))

        if "GABA" in neurotransmitters or "inhibitory" in lowered or "gabaergic" in lowered:
            return "Inhibitory"
        if "Glutamate" in neurotransmitters or "excitatory" in lowered or "glutamatergic" in lowered:
            return "Excitatory"
        if "Dopamine" in neurotransmitters or "dopaminergic" in lowered:
            return "Modulatory"
        return "Unknown"

    def detect_polarity(self, sentence: str) -> str:
        lowered = sentence.lower()
        contradiction_cues = [
            "did not observe",
            "failed to detect",
            "no evidence",
            "was not observed",
            "absent",
        ]
        return "contradict" if any(cue in lowered for cue in contradiction_cues) else "support"

    def extract(self, paper: Paper, text: str) -> list[Extraction]:
        extractions: list[Extraction] = []

        for sentence in self.split_sentences(text):
            entities = self.detect_entities(sentence)
            relation = self.detect_relation(sentence)
            candidate_nodes = (
                entities.get("brain_region", [])
                + entities.get("cell_type", [])
                + entities.get("disease", [])
            )

            if not relation or len(candidate_nodes) < 2:
                continue

            source, target = self._infer_direction(sentence, candidate_nodes)
            evidence = Evidence(
                paper=paper,
                sentence=sentence,
                method=first_or_none(entities.get("method", [])),
                species=first_or_none(entities.get("species", [])) or paper.species_hint,
                figure=self._detect_figure(sentence),
                polarity=self.detect_polarity(sentence),
            )

            extractions.append(
                Extraction(
                    source=source,
                    target=target,
                    relation=relation,
                    connection_type=self.detect_connection_type(entities, sentence),
                    evidence=evidence,
                )
            )

        return extractions

    def _infer_direction(self, sentence: str, candidate_nodes: list[str]) -> tuple[str, str]:
        """Infer source/target from common phrases, falling back to text order."""
        lowered = sentence.lower()

        for source in candidate_nodes:
            source_pos = lowered.find(source.lower())
            if source_pos < 0:
                continue

            for target in candidate_nodes:
                if target == source:
                    continue
                target_pos = lowered.find(target.lower())
                if target_pos < 0:
                    continue

                between = lowered[source_pos:target_pos] if source_pos < target_pos else ""
                if any(cue in between for cue in [" to ", " projects", " axons", " activates", " inhibits"]):
                    return source, target

        return candidate_nodes[0], candidate_nodes[1]

    def _detect_figure(self, sentence: str) -> str | None:
        match = re.search(r"\bfig(?:ure)?\.?\s*(\d+[A-Za-z]?)", sentence, re.IGNORECASE)
        if not match:
            return None
        return f"Figure {match.group(1)}"


# ---------------------------------------------------------------------------
# Knowledge graph
# ---------------------------------------------------------------------------

class NeuroGraph:
    def __init__(self):
        self.nodes: dict[str, Node] = {}
        self.edges: dict[tuple[str, str, str], Edge] = {}

    def add_node(self, name: str, kind: str = "concept") -> None:
        if name not in self.nodes:
            self.nodes[name] = Node(name=name, kind=kind)

    def add_extraction(self, extraction: Extraction, node_kinds: dict[str, str]) -> None:
        self.add_node(extraction.source, node_kinds.get(extraction.source, "concept"))
        self.add_node(extraction.target, node_kinds.get(extraction.target, "concept"))

        key = (extraction.source, extraction.target, extraction.relation)
        if key not in self.edges:
            self.edges[key] = Edge(
                source=extraction.source,
                target=extraction.target,
                relation=extraction.relation,
                connection_type=extraction.connection_type,
            )

        edge = self.edges[key]
        edge.evidence.append(extraction.evidence)

        if edge.connection_type == "Unknown" and extraction.connection_type != "Unknown":
            edge.connection_type = extraction.connection_type

        edge.confidence = score_edge(edge)

    def add_many(self, extractions: Iterable[Extraction], node_kinds: dict[str, str]) -> None:
        for extraction in extractions:
            self.add_extraction(extraction, node_kinds)

    def search(self, query: str, year: int | None = None) -> list[Edge]:
        terms = normalized_terms(query)
        scored: list[tuple[float, Edge]] = []

        for edge in self.edges_for_year(year):
            haystack = " ".join(
                [
                    edge.source,
                    edge.target,
                    edge.relation,
                    edge.connection_type,
                    " ".join(item.sentence for item in edge.evidence),
                    " ".join(item.paper.title for item in edge.evidence),
                ]
            ).lower()
            match_count = sum(1 for term in terms if term in haystack)
            if match_count:
                scored.append((match_count + edge.confidence / 100.0, edge))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [edge for _score, edge in scored]

    def node_view(self, node_name: str) -> tuple[list[Edge], list[Edge]]:
        canonical = self.resolve_node(node_name)
        if canonical is None:
            return [], []

        incoming = [edge for edge in self.edges.values() if edge.target == canonical]
        outgoing = [edge for edge in self.edges.values() if edge.source == canonical]
        incoming.sort(key=lambda edge: edge.confidence, reverse=True)
        outgoing.sort(key=lambda edge: edge.confidence, reverse=True)
        return incoming, outgoing

    def resolve_node(self, node_name: str) -> str | None:
        wanted = node_name.lower()
        for name in self.nodes:
            if name.lower() == wanted:
                return name
        for name in self.nodes:
            if wanted in name.lower() or name.lower() in wanted:
                return name
        return None

    def edges_for_year(self, year: int | None) -> list[Edge]:
        if year is None:
            return list(self.edges.values())

        filtered = []
        for edge in self.edges.values():
            evidence = [item for item in edge.evidence if item.paper.year <= year]
            if evidence:
                filtered_edge = Edge(
                    source=edge.source,
                    target=edge.target,
                    relation=edge.relation,
                    connection_type=edge.connection_type,
                    evidence=evidence,
                )
                filtered_edge.confidence = score_edge(filtered_edge)
                filtered.append(filtered_edge)
        return filtered

    def graph_text(self, year: int | None = None) -> str:
        lines = []
        for edge in sorted(self.edges_for_year(year), key=lambda item: (-item.confidence, item.source)):
            marker = "--" if edge.contradiction_count == 0 else "-x"
            lines.append(
                f"{edge.source} {marker}[{edge.relation}, {edge.connection_type}, "
                f"{edge.confidence:.0f}%]-> {edge.target}"
            )
        return "\n".join(lines)

    def conflict_edges(self) -> list[Edge]:
        edges = [edge for edge in self.edges.values() if edge.contradiction_count > 0]
        edges.sort(key=lambda edge: (-edge.contradiction_count, edge.source, edge.target))
        return edges

    def shortest_path(self, start: str, end: str) -> list[Edge]:
        source = self.resolve_node(start)
        target = self.resolve_node(end)
        if source is None or target is None:
            return []

        adjacency: dict[str, list[Edge]] = defaultdict(list)
        for edge in self.edges.values():
            adjacency[edge.source].append(edge)

        queue: list[tuple[str, list[Edge]]] = [(source, [])]
        visited = {source}

        while queue:
            current, path = queue.pop(0)
            if current == target:
                return path

            for edge in sorted(adjacency[current], key=lambda item: -item.confidence):
                if edge.target in visited:
                    continue
                visited.add(edge.target)
                queue.append((edge.target, path + [edge]))

        return []

    def to_dict(self) -> dict[str, object]:
        return {
            "nodes": [
                {
                    "id": node.name,
                    "label": node.name,
                    "kind": node.kind,
                }
                for node in sorted(self.nodes.values(), key=lambda item: item.name)
            ],
            "edges": [
                edge_to_dict(edge)
                for edge in sorted(self.edges.values(), key=lambda item: (item.source, item.target, item.relation))
            ],
        }


# ---------------------------------------------------------------------------
# Confidence scoring
# ---------------------------------------------------------------------------

def score_edge(edge: Edge) -> float:
    support = [item for item in edge.evidence if item.polarity == "support"]
    contradictions = [item for item in edge.evidence if item.polarity == "contradict"]

    if not support and contradictions:
        return 8.0

    paper_bonus = 1.0 - math.exp(-0.55 * len(unique_dois(support)))
    method_score = average(
        METHOD_WEIGHTS.get(item.method or "", 0.62)
        for item in support
    )
    replication_bonus = min(0.10, max(0, len(unique_dois(support)) - 1) * 0.03)
    conflict_penalty = min(0.45, 0.15 * len(unique_dois(contradictions)))

    score = 100 * ((0.40 * paper_bonus) + (0.45 * method_score) + replication_bonus - conflict_penalty)
    return max(0.0, min(99.0, score))


def unique_dois(evidence: Iterable[Evidence]) -> set[str]:
    return {item.paper.doi for item in evidence}


def average(values: Iterable[float]) -> float:
    values = list(values)
    if not values:
        return 0.40
    return sum(values) / len(values)


# ---------------------------------------------------------------------------
# Demo corpus
# ---------------------------------------------------------------------------

def build_node_kind_index() -> dict[str, str]:
    index = {}
    for kind, names in ENTITY_VOCAB.items():
        if kind in {"neurotransmitter", "method", "species"}:
            continue
        for canonical in names:
            index[canonical] = kind
    return index


def sample_corpus() -> list[tuple[Paper, str]]:
    return [
        (
            Paper(
                doi="10.1000/neurograph.2018.001",
                title="Anterograde mapping of retinal output pathways",
                authors=("Kim", "Patel"),
                year=2018,
                journal="Journal of Neuroscience",
                species_hint="Mouse",
                keywords=("retina", "visual system", "tracing"),
            ),
            """
            Using anterograde viral tracing in adult C57BL/6 mice, we found strong
            glutamatergic projections from retinal ganglion cells to the LGN in Figure 2A.
            Retinal ganglion cells also project excitatory axons to the superior colliculus.
            """,
        ),
        (
            Paper(
                doi="10.1000/neurograph.2021.014",
                title="Parallel visual streams from thalamus to cortex",
                authors=("Garcia", "Stone"),
                year=2021,
                journal="Neuron",
                species_hint="Mouse",
                keywords=("LGN", "visual cortex", "optogenetics"),
            ),
            """
            Optogenetics and patch clamp recordings showed that the LGN activates
            primary visual cortex through excitatory glutamatergic synapses.
            The optic nerve is connected to the retina and carries retinal ganglion cell axons.
            """,
        ),
        (
            Paper(
                doi="10.1000/neurograph.2017.009",
                title="Amygdala-hippocampal projections during fear memory retrieval",
                authors=("Wang", "Okafor"),
                year=2017,
                journal="Nature Neuroscience",
                species_hint="Mouse",
                keywords=("fear", "amygdala", "hippocampus"),
            ),
            """
            Anterograde tracing revealed that the basolateral amygdala projects
            glutamatergic axons to the ventral hippocampus during fear memory retrieval.
            Optogenetics showed that the hippocampus activates medial prefrontal cortex.
            """,
        ),
        (
            Paper(
                doi="10.1000/neurograph.2020.003",
                title="Prefrontal control of amygdala output",
                authors=("Singh", "Levy"),
                year=2020,
                journal="eLife",
                species_hint="Rat",
                keywords=("fear", "PFC", "amygdala"),
            ),
            """
            Patch clamp experiments in rats showed that prefrontal cortex inhibits
            amygdala output through GABAergic interneurons.
            """,
        ),
        (
            Paper(
                doi="10.1000/neurograph.2022.031",
                title="Cross-species variability in amygdala hippocampal tracing",
                authors=("Miller", "Chen"),
                year=2022,
                journal="Brain Structure and Function",
                species_hint="Human",
                keywords=("amygdala", "hippocampus", "conflict"),
            ),
            """
            In diffusion tensor imaging from humans, we did not observe a direct
            amygdala projection to the hippocampus.
            """,
        ),
        (
            Paper(
                doi="10.1000/neurograph.2019.022",
                title="Corticostriatal projections from layer V neurons",
                authors=("Ahmed", "Rosen"),
                year=2019,
                journal="Science",
                species_hint="Mouse",
                keywords=("motor cortex", "striatum", "corticostriatal"),
            ),
            """
            Using anterograde viral tracing in adult C57BL/6 mice, we found strong
            excitatory projections from layer V pyramidal neurons of the primary motor
            cortex to the dorsolateral striatum.
            """,
        ),
        (
            Paper(
                doi="10.1000/neurograph.2023.018",
                title="Dopaminergic vulnerability in Parkinsonian circuits",
                authors=("Nguyen", "Alvarez"),
                year=2023,
                journal="Cell Reports",
                species_hint="Human",
                keywords=("Parkinson", "dopamine", "basal ganglia"),
            ),
            """
            Dopaminergic neurons in the SNc are damaged in Parkinson's disease.
            The VTA projects dopamine-modulated axons to prefrontal cortex.
            """,
        ),
    ]


def build_demo_graph() -> NeuroGraph:
    extractor = NeuroExtractor(ENTITY_VOCAB)
    graph = NeuroGraph()
    node_kinds = build_node_kind_index()

    for paper, text in sample_corpus():
        graph.add_many(extractor.extract(paper, text), node_kinds)

    return graph


# ---------------------------------------------------------------------------
# Copilot-style summaries and renderers
# ---------------------------------------------------------------------------

def explain_query(graph: NeuroGraph, query: str) -> str:
    matches = graph.search(query)
    if not matches:
        return f"No graph evidence matched: {query!r}"

    top_edges = matches[:4]
    lines = [f"Evidence-backed explanation for {query!r}:"]
    for edge in top_edges:
        best = best_evidence(edge)
        lines.append(
            f"- {edge.source} {edge.relation.lower()} {edge.target} "
            f"({edge.connection_type.lower()}, confidence {edge.confidence:.0f}%). "
            f"Supported by {best.paper.title} ({best.paper.year}, {best.paper.doi})."
        )

    if any(edge.contradiction_count for edge in top_edges):
        lines.append("- Conflicting evidence is present; inspect edge details before treating it as settled.")

    return "\n".join(lines)


def render_edge(edge: Edge, show_evidence: bool = True) -> str:
    header = (
        f"{edge.source} -> {edge.target}\n"
        f"  relation: {edge.relation}\n"
        f"  type: {edge.connection_type}\n"
        f"  confidence: {edge.confidence:.0f}%\n"
        f"  support: {edge.support_count} paper(s)\n"
        f"  contradiction: {edge.contradiction_count} paper(s)"
    )

    if not show_evidence:
        return header

    evidence_lines = []
    for item in edge.evidence:
        method = item.method or "method not detected"
        species = item.species or "species not detected"
        figure = f", {item.figure}" if item.figure else ""
        evidence_lines.append(
            "  - "
            f"{item.polarity.upper()} | {item.paper.title} ({item.paper.year}, {item.paper.doi}) "
            f"[{species}, {method}{figure}]\n"
            f"    {compact(item.sentence)}"
        )

    return header + "\n" + "\n".join(evidence_lines)


def render_search(graph: NeuroGraph, query: str, limit: int = 8) -> str:
    matches = graph.search(query)[:limit]
    if not matches:
        return f"No matches for {query!r}."

    lines = [f"Search results for {query!r}:"]
    for edge in matches:
        lines.append(
            f"- {edge.source} -> {edge.target} "
            f"({edge.relation}, {edge.connection_type}, {edge.confidence:.0f}%, "
            f"{edge.support_count} support / {edge.contradiction_count} contradict)"
        )
    return "\n".join(lines)


def render_node(graph: NeuroGraph, node_name: str) -> str:
    canonical = graph.resolve_node(node_name)
    if canonical is None:
        return f"No node matched {node_name!r}."

    incoming, outgoing = graph.node_view(canonical)
    lines = [f"Node: {canonical}", f"Kind: {graph.nodes[canonical].kind}"]

    lines.append("\nIncoming pathways:")
    lines.extend(render_edge_list(incoming))

    lines.append("\nOutgoing pathways:")
    lines.extend(render_edge_list(outgoing))

    return "\n".join(lines)


def render_path(graph: NeuroGraph, start: str, end: str) -> str:
    path = graph.shortest_path(start, end)
    if not path:
        return f"No directed path found from {start!r} to {end!r}."

    lines = [f"Path from {path[0].source} to {path[-1].target}:"]
    for edge in path:
        lines.append(
            f"- {edge.source} -> {edge.target} "
            f"({edge.relation}, {edge.connection_type}, {edge.confidence:.0f}%)"
        )
    return "\n".join(lines)


def render_conflicts(graph: NeuroGraph) -> str:
    conflicts = graph.conflict_edges()
    if not conflicts:
        return "No conflicting graph edges detected."

    lines = ["Conflicting evidence:"]
    for edge in conflicts:
        lines.append(
            f"\n{edge.source} -> {edge.target} "
            f"({edge.relation}, confidence {edge.confidence:.0f}%)"
        )
        for item in edge.evidence:
            marker = "supports" if item.polarity == "support" else "contradicts"
            lines.append(
                f"- {marker}: {item.paper.title} ({item.paper.year}, {item.paper.doi}) "
                f"[{item.species or 'unknown species'}]"
            )
            lines.append(f"  {compact(item.sentence)}")
    return "\n".join(lines)


def render_entities(graph: NeuroGraph) -> str:
    groups: dict[str, list[str]] = defaultdict(list)
    for node in graph.nodes.values():
        groups[node.kind].append(node.name)

    lines = ["Extracted entities:"]
    for kind in sorted(groups):
        names = ", ".join(sorted(groups[kind]))
        lines.append(f"- {kind}: {names}")
    return "\n".join(lines)


def render_edge_list(edges: list[Edge]) -> list[str]:
    if not edges:
        return ["- none detected"]

    return [
        f"- {edge.source} -> {edge.target} "
        f"({edge.relation}, {edge.connection_type}, {edge.confidence:.0f}%)"
        for edge in edges
    ]


def best_evidence(edge: Edge) -> Evidence:
    supports = [item for item in edge.evidence if item.polarity == "support"]
    if supports:
        return max(supports, key=lambda item: METHOD_WEIGHTS.get(item.method or "", 0.62))
    return edge.evidence[0]


def edge_to_dict(edge: Edge) -> dict[str, object]:
    return {
        "source": edge.source,
        "target": edge.target,
        "relation": edge.relation,
        "connection_type": edge.connection_type,
        "confidence": round(edge.confidence, 2),
        "support_count": edge.support_count,
        "contradiction_count": edge.contradiction_count,
        "evidence": [evidence_to_dict(item) for item in edge.evidence],
    }


def evidence_to_dict(evidence: Evidence) -> dict[str, object]:
    return {
        "polarity": evidence.polarity,
        "sentence": " ".join(evidence.sentence.split()),
        "method": evidence.method,
        "species": evidence.species,
        "figure": evidence.figure,
        "paper": {
            "doi": evidence.paper.doi,
            "title": evidence.paper.title,
            "authors": list(evidence.paper.authors),
            "year": evidence.paper.year,
            "journal": evidence.paper.journal,
            "keywords": list(evidence.paper.keywords),
        },
    }


def export_graph(graph: NeuroGraph, output_path: Path) -> None:
    output_path.write_text(json.dumps(graph.to_dict(), indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def first_or_none(values: list[str] | None) -> str | None:
    if not values:
        return None
    return values[0]


def normalized_terms(query: str) -> list[str]:
    terms = re.findall(r"[a-zA-Z0-9']+", query.lower())
    stopwords = {"show", "all", "the", "a", "an", "of", "to", "in", "and", "involving"}
    return [term for term in terms if term not in stopwords]


def compact(text: str, width: int = 92) -> str:
    return textwrap.shorten(" ".join(text.split()), width=width, placeholder="...")


def print_default_demo(graph: NeuroGraph) -> None:
    print("NeuroGraph MVP")
    print("=" * 60)
    print(f"Nodes: {len(graph.nodes)}")
    print(f"Edges: {len(graph.edges)}")
    print()

    print("Graph view")
    print("-" * 60)
    print(graph.graph_text())
    print()

    print(render_search(graph, "retinal ganglion cells glutamate"))
    print()

    print(explain_query(graph, "fear memories"))
    print()

    print("Detailed edge evidence")
    print("-" * 60)
    top_edge = max(graph.edges.values(), key=lambda edge: edge.confidence)
    print(render_edge(top_edge))


def run_interactive(graph: NeuroGraph) -> None:
    print("NeuroGraph interactive mode")
    print("Commands: search <query>, node <name>, path <from> -> <to>, explain <query>, conflicts, entities, graph, quit")

    while True:
        try:
            command = input("neurograph> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return

        if not command:
            continue
        if command in {"quit", "exit", "q"}:
            return
        if command == "graph":
            print(graph.graph_text())
        elif command == "conflicts":
            print(render_conflicts(graph))
        elif command == "entities":
            print(render_entities(graph))
        elif command.startswith("search "):
            print(render_search(graph, command.removeprefix("search ").strip()))
        elif command.startswith("node "):
            print(render_node(graph, command.removeprefix("node ").strip()))
        elif command.startswith("explain "):
            print(explain_query(graph, command.removeprefix("explain ").strip()))
        elif command.startswith("path ") and " -> " in command:
            route = command.removeprefix("path ").split(" -> ", 1)
            print(render_path(graph, route[0].strip(), route[1].strip()))
        else:
            print("Unknown command.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="NeuroGraph MVP knowledge graph demo")
    subparsers = parser.add_subparsers(dest="command")

    search = subparsers.add_parser("search", help="Search graph edges with natural language")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=8)

    node = subparsers.add_parser("node", help="Show incoming and outgoing pathways for a node")
    node.add_argument("name")

    explain = subparsers.add_parser("explain", help="Generate an evidence-backed explanation")
    explain.add_argument("query")

    path = subparsers.add_parser("path", help="Find a directed path between two graph nodes")
    path.add_argument("start")
    path.add_argument("end")

    subparsers.add_parser("conflicts", help="Show edges with contradictory evidence")
    subparsers.add_parser("entities", help="List extracted graph entities by type")
    subparsers.add_parser("interactive", help="Start an interactive NeuroGraph shell")

    export = subparsers.add_parser("export", help="Export nodes, edges, and evidence as JSON")
    export.add_argument("output_path")

    timeline = subparsers.add_parser("timeline", help="Show graph using evidence up to a given year")
    timeline.add_argument("year", type=int)

    edge = subparsers.add_parser("edge", help="Show detailed evidence for matching edges")
    edge.add_argument("query")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    graph = build_demo_graph()

    if args.command == "search":
        print(render_search(graph, args.query, limit=args.limit))
    elif args.command == "node":
        print(render_node(graph, args.name))
    elif args.command == "explain":
        print(explain_query(graph, args.query))
    elif args.command == "path":
        print(render_path(graph, args.start, args.end))
    elif args.command == "conflicts":
        print(render_conflicts(graph))
    elif args.command == "entities":
        print(render_entities(graph))
    elif args.command == "interactive":
        run_interactive(graph)
    elif args.command == "export":
        output_path = Path(args.output_path)
        export_graph(graph, output_path)
        print(f"Exported {len(graph.nodes)} nodes and {len(graph.edges)} edges to {output_path}.")
    elif args.command == "timeline":
        print(f"NeuroGraph timeline through {args.year}")
        print("-" * 60)
        print(graph.graph_text(year=args.year))
    elif args.command == "edge":
        matches = graph.search(args.query)
        if not matches:
            print(f"No matches for {args.query!r}.")
        else:
            print("\n\n".join(render_edge(edge) for edge in matches[:5]))
    else:
        print_default_demo(graph)


if __name__ == "__main__":
    main()
