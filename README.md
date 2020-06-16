# About

This library is a **Graphout** module. It's not intended to be used alone.

The module adds support for outputing **Graphout** queries to statuspage.io, using [`custom metrics`](https://developer.statuspage.io/#tag/metrics).

## Configuration params

to use this module, make sure to configure it in **Graphout** config.
here are the available params:

```json
{
    "output": "graphout-output-statuspage-io",
    "params":
    {
        "api_key": "00000000-0000-0000-0000-000000000000",
        "page_id": "xxxxxxxxxxxx",
        "send_interval": 60
    }
}
```

**`output`**

Set this to `graphout-output-statuspage-io`

**`params.api_key`**

Set this to the API key of your statuspage.io page.

**`params.page_id`**

Set this to the Page Id of your statuspage.io account.

**`params.send_interval`**

Metrics will be submitted to statuspage.io each `send_inerval`. Default is 60 seconds. The interval must be between 30 and 300 seconds.

From statuspage.io API docs:
> Each data point is cast to its nearest 30s interval, giving us a maximum of 10 data points per 5 minute period. Submitting multiple data points near each other will result in the last data point being the only one stored.

Basically, you should set Graphout query `interval` at least to 30 seconds.

**Important Note:**

In order for this plugin to be able to send metrics to the right statuspage.io `custom metric` you will need to set `name` of each query to the `name` of the `metric` of the statuspage.io.

Here is an example Graphout named query configuration:

```javascript
{
    "carbon.updateOperations":
    {
        "name": "the metric name from statuspage.io",
        "query": "sumSeries(carbon.agents.*.updateOperations)",
        "from": "-1min",
        "until": "now"
    }
}
```
