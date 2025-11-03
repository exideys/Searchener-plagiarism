using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Texts.Infrastructure;
using Xunit;

namespace Texts.Application.Tests;

public class GoogleSearchClientTests
{
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<ILogger<GoogleSearchClient>> _loggerMock;
    private readonly IMemoryCache _memoryCache;
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;
    private readonly HttpClient _httpClient;

    public GoogleSearchClientTests()
    {
        _configurationMock = new Mock<IConfiguration>();
        _loggerMock = new Mock<ILogger<GoogleSearchClient>>();
        _memoryCache = new MemoryCache(new MemoryCacheOptions());
        _httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_httpMessageHandlerMock.Object)
        {
            BaseAddress = new Uri("https://www.googleapis.com/customsearch/v1/")
        };

        _configurationMock.Setup(c => c["GoogleSearch:ApiKey"]).Returns("fake-api-key");
        _configurationMock.Setup(c => c["GoogleSearch:SearchEngineId"]).Returns("fake-cse-id");
    }

    private void SetupHttpMock(string phrase, string responseUrl)
    {
        var jsonResponse = $$"""
        {
            "kind": "customsearch#search",
            "items": [
                {
                    "kind": "customsearch#result",
                    "title": "Test Result",
                    "link": "{{responseUrl}}",
                    "displayLink": "example.com"
                }
            ]
        }
        """;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => 
                    req.Method == HttpMethod.Get && 
                    req.RequestUri != null &&
                    req.RequestUri.Query.Contains($"q={Uri.EscapeDataString(phrase)}")),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse, System.Text.Encoding.UTF8, "application/json")
            })
            .Verifiable();
    }

    [Fact]
    public async Task FindFirstMatchUrlAsync_ShouldCallApiAndCacheResult_WhenCacheIsEmpty()
    {
        var phrase = "test phrase";
        var expectedUrl = "http://example.com/test";
        SetupHttpMock(phrase, expectedUrl);

        var client = new GoogleSearchClient(_httpClient, _configurationMock.Object, _loggerMock.Object, _memoryCache);

        var result = await client.FindFirstMatchUrlAsync(phrase);

        Assert.Equal(expectedUrl, result);
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req => req.Method == HttpMethod.Get),
            ItExpr.IsAny<CancellationToken>()
        );

        var cachedValue = _memoryCache.Get(phrase);
        Assert.Equal(expectedUrl, cachedValue);
    }

    [Fact]
    public async Task FindFirstMatchUrlAsync_ShouldReturnResultFromCache_WhenCalledAgain()
    {
        var phrase = "cached phrase";
        var expectedUrl = "http://example.com/cached";
        SetupHttpMock(phrase, expectedUrl);

        var client = new GoogleSearchClient(_httpClient, _configurationMock.Object, _loggerMock.Object, _memoryCache);

        await client.FindFirstMatchUrlAsync(phrase); 
        var result = await client.FindFirstMatchUrlAsync(phrase);

        Assert.Equal(expectedUrl, result);

        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req => 
                req.Method == HttpMethod.Get && 
                req.RequestUri != null &&
                req.RequestUri.Query.Contains($"q={Uri.EscapeDataString(phrase)}")),
            ItExpr.IsAny<CancellationToken>()
        );
    }
}