const d3 = require("d3");
const cloud = require(".");
const moment = require("moment-jalaali");

Chart.defaults.global.defaultFontFamily = "Shabnam";

const colors = ["#808080", "#000000", "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
"#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324",
"#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#ffffff"];

const chart = document.getElementById("chart");
const cursor_image = document.getElementById("cursor-image");
let chart_data = {
    datasets: []
};

let state = "cursor.png" // cursor.png vs hand.png

let r_tl = {	// request for timeline
    protocol: "http",
    domain: "217.218.215.67",
    port: "6649",
    path: "timeline/root",
    options: {
        start: "2017-05-01",
        end: "2019-05-01",
        step: "30"
    }
};

let r_wc = {	// request for wordcloud
    protocol: "http",
    domain: "217.218.215.67",
    port: "6649",
    path: "wordcloud/root",
    options: {
        start: "2017-05-01",
        end: "2017-6-01"
    }
};

function draw_wordcloud(url) {
    fetch(url)
        .then(resp => resp.json())
        .then(function (data) {
            let words_list = [];
            for (key in data) {
                words_list.push({
                    text: key,
                    size: data[key]
                });
            }

            let words_color = d3.scaleOrdinal(d3.schemeCategory10);

            let words_scale =
                d3.scaleLinear()
                .range([0, 100])
                .domain(
                    [
                        d3.min(words_list, function(d) {return d.size;}),
                        d3.max(words_list, function(d) {return d.size;})
                    ]
                )

            let layout = cloud()
                .size([1044, 500])
                .words(words_list)
                .padding(5)
                .rotate(0)
                .font("Impact")
                .fontSize(function (d) {
                    return words_scale(d.size);
                })
                .on("end", draw);

            layout.start();

            function draw(words) {
                d3.select("#word-cloud").append("svg")
                    .attr("width", layout.size()[0])
                    .attr("height", layout.size()[1])
                    .append("g")
                    .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
                    .selectAll("text")
                    .data(words)
                    .enter().append("text")
                    .style("font-size", function (d) {
                        return d.size + "px";
                    })
                    .style("font-family", "Impact")
                    .style("fill", function(d, i) {return words_color(i);})
                    .attr("text-anchor", "middle")
                    .attr("transform", function (d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                    })
                    .text(function (d) {
                        return d.text;
                    });
            }
        });
}

function draw_chart(url) {
    fetch(url)
        .then(resp => resp.json())
        .then(function (data) {
            chart_data["labels"] = convert_to_jalaali(data["dates"]);

            chart_data["datasets"] = [];

            data["topics"].forEach(function (value, i) {
                chart_data["datasets"].push({
                    label: value["title"],
                    data: value["points"],
                    backgroundColor: colors[i],
                    borderColor: colors[i],
                    borderWidth: 1,
                    fill: false,
                    pointBackgroundColor: colors[i]
                });
            });

            if (chart) {
                new Chart(chart, {
                    type: "line",
                    data: chart_data,
                    options: {
                        scales: {
                            xAxes: [{
                                ticks: {
                                    maxRotation: 90
                                }
                            }],
                            yAxes: [{
                                ticks: {
                                    beginAtZero: false
                                }
                            }]
                        },
                        legend: {
                            position: "top",
                            labels: {
                                boxWidth: 5,
                                usePointStyle: true,
                                padding: 25
                            }
                        },
                        layout: {
                            padding: {
                                top: -15
                            }
                        },
                        events: ["click", "mousemove"],
                        onClick: clicked,
                        pan: {
                            enabled: true,
                            mode: "x"
                        },

                        zoom: {
                            enabled: true,
                            mode: "x"
                        }
                    }
                });
            }
        })
        .catch(function (error) {
            console.error(error);
        });
}

function create_url(r) {
    let result = `${r["protocol"]}://${r["domain"]}:${r["port"]}/${r["path"]}`;
    let options = r["options"];
    if (options) {
        result += "?";
        for (let key in options) {
            if (options.hasOwnProperty(key)) result += `${key}=${options[key]}&`;
        }

        result = result.slice(0, -1);
    }
    return result;
}

function clicked(c) {
    let element = this.getElementAtEvent(c)[0];
    let dataset_index = element["_datasetIndex"];
    let index = element["_index"];

    let selected_date = chart_data["labels"][index];
    let selected_chart = chart_data["datasets"][dataset_index]["label"];

    if(state === "cursor.png") {
        let r = r_tl;
        r["path"] += `-${dataset_index}`;
    
        draw_chart(create_url(r));

        $("#chart-div").removeClass("hidden");
        $("#wordcloud-div").addClass("hidden");
    } else if(state === "hand.png") {
        selected_date_gregorian = moment(number_to_english(selected_date), "jYYYY-jMM-jDD");

        end_date = selected_date_gregorian.format("YYYY-MM-DD");
        start_date = selected_date_gregorian.subtract(Number(r_tl["options"]["step"]), "days").format("YYYY-MM-DD");

        let r = r_wc;
        r["options"]["start"] = start_date;
        r["options"]["end"] = end_date;

        $("#word-cloud svg").remove();

        draw_wordcloud(create_url(r));

        $("#chart-div").addClass("hidden");
        $("#wordcloud-div").removeClass("hidden");
        cursor_image.src = "assets/img/back.png";
    }
}

function number_to_persian(string) {
    const persian_digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    return string.toString().replace(/\d/g, x => persian_digits[x]);
}

function number_to_english(string) {
    const persian_digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    return string.toString().replace(/[۰۱۲۳۴۵۶۷۸۹]/g, x => persian_digits.indexOf(x));
}

function convert_to_jalaali(dates) {
    let converted = [];

    dates.forEach((value, i) => {
        let date = moment(value);
        converted.push(number_to_persian(date.format("jYYYY-jMM-jDD")));
    })

    return converted;
}

function change_method() {
    state = cursor_image.src.split("/").pop();
    if(state === "cursor.png") {
        cursor_image.src = "assets/img/hand.png";
        state = "hand.png";
        $("#chart-div").addClass("pointer");
    } else if(state === "hand.png") {
        cursor_image.src = "assets/img/cursor.png";
        state = "cursor.png";
        $("#chart-div").removeClass("pointer");
    } else if(state === "back.png") {
        cursor_image.src = "assets/img/hand.png";
        state = "hand.png";
        $("#chart-div").removeClass("hidden");
        $("#wordcloud-div").addClass("hidden");
    }
}

let url = create_url(r_tl);
draw_chart(url);

url = create_url(r_wc);
draw_wordcloud(url);

$("#method-indicator").click(function() {
    change_method();
})


$(".closeAsideNav i").click(function () {
    $(".asideNavbar").removeClass("openAsideNavbar");
    $(".mainDashboard").removeClass("leftVerticalMenu");
    $(".asideNavbar").addClass("closeAsideNavbar");
    $(".mainDashboard").addClass("wideVerticalMenu");
});

$(".openAsideNav i").click(function () {
    $(".asideNavbar").removeClass("closeAsideNavbar");
    $(".mainDashboard").removeClass("wideVerticalMenu");
    $(".asideNavbar").addClass("openAsideNavbar");
    $(".mainDashboard").addClass("leftVerticalMenu");
});

$(".closeAsideNav i").click(function () {
    $(".asideNavbar").removeClass("openAsideNavbar");
    $(".mainDashboard").removeClass("leftVerticalMenu");
    $(".asideNavbar").addClass("closeAsideNavbar");
    $(".mainDashboard").addClass("wideVerticalMenu");
});

$(".asideNavbarItems li a").click(function () {
    $(".asideNavbar").removeClass("closeAsideNavbar");
    $(".mainDashboard").removeClass("wideVerticalMenu");
    $(".asideNavbar").addClass("openAsideNavbar");
    $(".mainDashboard").addClass("leftVerticalMenu");
});