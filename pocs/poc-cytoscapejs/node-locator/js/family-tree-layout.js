/* We are going to display the main person's: 
 * 1. Biological great-granparents
 * 2. Biological grandparents
 * 3. Biological parents
 * 4. Biological brothers
 * 5. Spouses/Husbands (only those who had children)
 * 6. Biological sons
 * 7. Biological grandsons
 */

const BASE_SPACING = 60
const NODE_HORIZONTAL_SPACING = 3 * BASE_SPACING
const NODE_VERTICAL_SPACING = 4 * BASE_SPACING

const UNKNOWN_COUPLE_ID = 99999999999999


function abueNodes2CytoNodes(nodeList) {
    return nodeList.map(function(node) {
        return {
            group: "nodes",
            data: {
                ...node,
            },
            position: {
                x: 0,
                y: 0,
            },
            classes: [
                "multiline-auto",
            ],
        }
    })
}


function nodeIsMissingOneParent(node) {
    let parentNodes = [node.data.father, node.data.mother]
    return parentNodes.includes(null)
}


function setFamilyTreeNodePositions(nodeList) {
    // 1. Sort the nodes by birth year.
    nodeList.sort((a, b) => a.data.birthYear - b.data.birthYear)

    // 2. Calculate the positions of the main node and its siblings.
    let siblingsAndMainNodes = nodeList.filter((node) => node.data.rel === "main" || node.data.rel === "sibling")
    siblingsAndMainNodes.forEach((node, i) => node.position = { x: NODE_HORIZONTAL_SPACING * i, y: 0 })

    // 3. Using the position of the first and last sibling, calculate the position of the parent nodes.
    let parentNodes = nodeList.filter((node) => node.data.rel === "parent")
    let eldestSibling = siblingsAndMainNodes[0]
    let youngerSibling = siblingsAndMainNodes.at(-1)
    if (parentNodes.length >= 1) {
        let firstParent = parentNodes[0]
        firstParent.position = {
            x: eldestSibling.position.x - NODE_HORIZONTAL_SPACING,
            y: eldestSibling.position.y - NODE_VERTICAL_SPACING,
        }
    }
    if (parentNodes.length == 2) {
        let secondParent = parentNodes[1]
        secondParent.position = {
            x: youngerSibling.position.x + NODE_HORIZONTAL_SPACING,
            y: youngerSibling.position.y - NODE_VERTICAL_SPACING,
        }
    }

    // 4. Using the position of the parent nodes, calculate the position of the grandparent nodes.
    // let grandparentNodes = nodeList.filter((node) => node.data.rel === "grandparent")
    for (let parentNode of parentNodes) {
        let grandparentNodes = nodeList.filter((node) => node.data.id === parentNode.data.father || node.data.id == parentNode.data.mother)
        if (grandparentNodes.length >= 1) {
            let firstGrandparent = grandparentNodes[0]
            firstGrandparent.position = {
                x: parentNode.position.x - NODE_HORIZONTAL_SPACING / 2,
                y: parentNode.position.y - NODE_VERTICAL_SPACING,
            }
        }
        if (grandparentNodes.length == 2) {
            let secondGrandparent = grandparentNodes[1]
            secondGrandparent.position = {
                x: parentNode.position.x + NODE_HORIZONTAL_SPACING / 2,
                y: parentNode.position.y - NODE_VERTICAL_SPACING,
            }
        }
    }

    // 5. Using the position of the main node, calculate the position of the son and couple nodes.
    // 5.1 If there are sons without a parent, we will add a "placeholder" node for the father/mother of all those nodes.
    let sonsWithoutOneParent = nodeList.filter((node) => node.data.rel === "son" && nodeIsMissingOneParent(node))
    if (sonsWithoutOneParent.length > 0) {
        nodeList.push(
            {
                group: "nodes",
                data: {
                    id: UNKNOWN_COUPLE_ID,
                    name: "Unknown couple",
                    father: null,
                    mother: null,
                    rel: "couple",
                    birthYear: 0,
                },
                position: {
                    x: 0,
                    y: 0,
                },
                classes: [
                    "multiline-auto",
                ],
            }
        )
    }
    sonsWithoutOneParent.forEach(function(node) {
        if (node.data.father === null) {
            node.data.father = UNKNOWN_COUPLE_ID
        } else {
            node.data.mother = UNKNOWN_COUPLE_ID
        }
    })
    // 5.2 Calculate the positions
    let mainNode = nodeList.find((node) => node.data.rel === "main")
    let horizontalSpaceAcc = mainNode.position.x
    let coupleNodes = nodeList.filter((node) => node.data.rel === "couple")
    for (let couple of coupleNodes) {
        let sonNodes = nodeList.filter((node) => node.data.father === couple.data.id || node.data.mother === couple.data.id)
        sonNodes.forEach((node, i) => node.position = { x: horizontalSpaceAcc + (NODE_HORIZONTAL_SPACING * i), y: mainNode.position.y + (NODE_VERTICAL_SPACING * 2)})
        let eldestSon = sonNodes.at(-1)
        couple.position = { x: eldestSon.position.x + NODE_HORIZONTAL_SPACING, y: mainNode.position.y + NODE_VERTICAL_SPACING }
        horizontalSpaceAcc += (sonNodes.length + 1) * NODE_HORIZONTAL_SPACING
    }

    // 6. Using the position of the son nodes, calculate the position of the grandson nodes.
    let sonNodes = nodeList.filter((node) => node.data.rel === "son")
    for (let son of sonNodes) {
        let grandsons = nodeList.filter((node) => node.data.father === son.data.id || node.data.mother === son.data.id)
        for (let i = 0; i < grandsons.length; i++) {
            grandsons[i].position.x = son.position.x
            grandsons[i].position.y = (son.position.y) + (i + 1) * (NODE_VERTICAL_SPACING / 2)
        }
    }
}


function getFamilyTreeEdges(nodeList) {
    let edges = []
    for (let son of nodeList) {
        let parentNodes = [
            nodeList.find((node) => node.data.id === son.data.father),
            nodeList.find((node) => node.data.id === son.data.mother),
        ]
        for (let parentN of parentNodes) {
            if (parentN === undefined) {
                continue
            }
            edges.push(
                {
                    group: "edges",
                    data: {
                        id: `${son.data.id}->${parentN.data.id}`,
                        source: son.data.id,
                        target: parentN.data.id,
                    },
                }
            )
        }
    }
    return edges
}

cytoNodes = abueNodes2CytoNodes(abueNodes)

setFamilyTreeNodePositions(cytoNodes)
cytoEdges = getFamilyTreeEdges(cytoNodes)

nodesAndPositions = cytoNodes.map(function(node) {
    return {
        name: node.data.name,
        birthYear: node.data.birthYear,
        x: node.position.x,
        y: node.position.y
    }
})

console.table(nodesAndPositions)

var cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [
        ...cytoNodes,
        ...cytoEdges,
    ],
    style: [
        // Style for nodes
        {
            selector: "node",
            style: {
                "text-valign": "center",
                "text-halign": "center",
                "border-color": "#000000",
                "border-width": "2px",
                "background-color": "#FFFFFF",
                "label": "data(name)",
                "width": "85px",
                "height": "85px",
            },
        },
        {
            selector: ".multiline-manual",
            style: {
                "text-wrap": "wrap"
            },
        },
        {
            selector: ".multiline-auto",
            style: {
                "text-wrap": "wrap",
                "text-max-width": 80
            },
        },
        // Style for edges
        {
            selector: "edge",
            style: {
                "curve-style": "taxi",
                "taxi-direction": "upward",
                "taxi-turn": "60px",
            },
        },
    ],
    layout: {
        name: "preset",
    },
})

let mainNode = cy.$("#1")
cy.center(mainNode)
